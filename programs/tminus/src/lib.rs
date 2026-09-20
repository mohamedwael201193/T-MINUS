use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        self, CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked,
    },
};

declare_id!("HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL");

pub const ORDER_SEED: &[u8] = b"order";
pub const RATIO_SCALE: u128 = 1_000_000_000;
pub const STATUS_OPEN: u8 = 0;
pub const STATUS_CLOSED: u8 = 1;
pub const TOKEN_2022_ID: Pubkey = pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const MINT_BASE_LEN: usize = 82;
const EXT_TRANSFER_HOOK: u16 = 14;
const EXT_PAUSABLE_CONFIG: u16 = 26;

#[program]
pub mod tminus {
    use super::*;

    pub fn place(
        ctx: Context<Place>,
        nonce: u64,
        amount_raw: u64,
        min_ratio_e9: u64,
        failsafe_floor_e9: u64,
        failsafe_ts: i64,
        hard_expiry_ts: i64,
        min_fill_raw: u64,
        src_multiplier_e9: u64,
    ) -> Result<()> {
        require!(amount_raw > 0, TminusError::ZeroAmount);
        require!(min_fill_raw > 0, TminusError::ZeroAmount);
        require!(min_ratio_e9 > 0, TminusError::InvalidRatio);
        require!(failsafe_floor_e9 > 0, TminusError::InvalidRatio);
        require!(
            failsafe_floor_e9 <= min_ratio_e9,
            TminusError::InvalidRatio
        );
        require!(failsafe_ts <= hard_expiry_ts, TminusError::InvalidTimestamps);
        require!(
            ctx.accounts.src_mint.key() != ctx.accounts.dst_mint.key(),
            TminusError::MintsMustDiffer
        );
        assert_src_mint_allowed(ctx.accounts.src_mint.as_ref())?;

        let before = ctx.accounts.escrow_ata.amount;
        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.owner_src_ata.to_account_info(),
                    mint: ctx.accounts.src_mint.to_account_info(),
                    to: ctx.accounts.escrow_ata.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount_raw,
            ctx.accounts.src_mint.decimals,
        )?;
        ctx.accounts.escrow_ata.reload()?;
        let received = ctx
            .accounts
            .escrow_ata
            .amount
            .checked_sub(before)
            .ok_or(TminusError::Overflow)?;
        require!(received > 0, TminusError::FeeUnaccounted);

        let order = &mut ctx.accounts.order;
        order.owner = ctx.accounts.owner.key();
        order.src_mint = ctx.accounts.src_mint.key();
        order.dst_mint = ctx.accounts.dst_mint.key();
        order.escrow_ata = ctx.accounts.escrow_ata.key();
        order.nonce = nonce;
        order.src_decimals = ctx.accounts.src_mint.decimals;
        order.dst_decimals = ctx.accounts.dst_mint.decimals;
        order.src_multiplier_e9 = src_multiplier_e9;
        order.escrowed_raw = received;
        order.filled_raw = 0;
        order.min_ratio_e9 = min_ratio_e9;
        order.failsafe_floor_e9 = failsafe_floor_e9;
        order.failsafe_ts = failsafe_ts;
        order.hard_expiry_ts = hard_expiry_ts;
        order.min_fill_raw = min_fill_raw;
        order.status = STATUS_OPEN;
        order.bump = ctx.bumps.order;

        emit!(OrderPlaced {
            order: order.key(),
            owner: order.owner,
            src_mint: order.src_mint,
            dst_mint: order.dst_mint,
            escrowed_raw: received,
            min_ratio_e9,
            failsafe_floor_e9,
            failsafe_ts,
            hard_expiry_ts,
        });
        Ok(())
    }

    pub fn cancel(mut ctx: Context<Cancel>) -> Result<()> {
        return_remaining_and_close(&mut ctx.accounts)
    }

    pub fn fill(mut ctx: Context<Fill>, fill_src_raw: u64, dst_raw: u64) -> Result<()> {
        let clock = Clock::get()?;
        let order = &ctx.accounts.order;
        require!(order.status == STATUS_OPEN, TminusError::StatusClosed);
        require!(
            clock.unix_timestamp < order.hard_expiry_ts,
            TminusError::HardExpired
        );
        assert_src_mint_allowed(ctx.accounts.src_mint.as_ref())?;

        ctx.accounts.escrow_ata.reload()?;
        let remaining = ctx.accounts.escrow_ata.amount;
        require!(fill_src_raw > 0, TminusError::ZeroAmount);
        require!(fill_src_raw <= remaining, TminusError::InsufficientEscrow);
        if remaining > order.min_fill_raw {
            require!(
                fill_src_raw >= order.min_fill_raw || fill_src_raw == remaining,
                TminusError::FillTooSmall
            );
        } else {
            require!(fill_src_raw == remaining, TminusError::FillTooSmall);
        }

        let floor = if clock.unix_timestamp >= order.failsafe_ts {
            order.failsafe_floor_e9
        } else {
            order.min_ratio_e9
        };
        let failsafe_used = clock.unix_timestamp >= order.failsafe_ts;
        let min_dst = ceil_ratio(fill_src_raw, floor)?;
        require!(dst_raw >= min_dst, TminusError::UnderDelivery);

        let dst_before = ctx.accounts.owner_dst_ata.amount;
        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.dst_token_program.key(),
                TransferChecked {
                    from: ctx.accounts.filler_dst_ata.to_account_info(),
                    mint: ctx.accounts.dst_mint.to_account_info(),
                    to: ctx.accounts.owner_dst_ata.to_account_info(),
                    authority: ctx.accounts.filler.to_account_info(),
                },
            ),
            dst_raw,
            ctx.accounts.dst_mint.decimals,
        )?;
        ctx.accounts.owner_dst_ata.reload()?;
        let dst_delta = ctx
            .accounts
            .owner_dst_ata
            .amount
            .checked_sub(dst_before)
            .ok_or(TminusError::Overflow)?;
        require!(dst_delta >= min_dst, TminusError::UnderDelivery);

        let src_before = ctx.accounts.escrow_ata.amount;
        let seeds: &[&[u8]] = &[
            ORDER_SEED,
            order.owner.as_ref(),
            order.src_mint.as_ref(),
            order.dst_mint.as_ref(),
            &order.nonce.to_le_bytes(),
            &[order.bump],
        ];
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.escrow_ata.to_account_info(),
                    mint: ctx.accounts.src_mint.to_account_info(),
                    to: ctx.accounts.filler_src_ata.to_account_info(),
                    authority: ctx.accounts.order.to_account_info(),
                },
                &[seeds],
            ),
            fill_src_raw,
            ctx.accounts.src_mint.decimals,
        )?;
        ctx.accounts.escrow_ata.reload()?;
        let src_delta = src_before
            .checked_sub(ctx.accounts.escrow_ata.amount)
            .ok_or(TminusError::Overflow)?;
        require!(src_delta == fill_src_raw, TminusError::FeeUnaccounted);

        let order = &mut ctx.accounts.order;
        order.filled_raw = order
            .filled_raw
            .checked_add(src_delta)
            .ok_or(TminusError::Overflow)?;
        require!(
            order.filled_raw <= order.escrowed_raw,
            TminusError::Overflow
        );

        emit!(OrderFilled {
            order: order.key(),
            filler: ctx.accounts.filler.key(),
            src_delta,
            dst_delta,
            ratio_e9: floor,
            failsafe_used,
        });

        if ctx.accounts.escrow_ata.amount == 0 {
            close_filled_escrow(&mut ctx)?;
        }
        Ok(())
    }

    pub fn expire(mut ctx: Context<Expire>) -> Result<()> {
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= ctx.accounts.order.hard_expiry_ts,
            TminusError::TooEarlyExpire
        );
        return_remaining_and_close_expire(&mut ctx.accounts)
    }
}

fn ceil_ratio(src: u64, ratio_e9: u64) -> Result<u64> {
    let v = (src as u128)
        .checked_mul(ratio_e9 as u128)
        .ok_or(TminusError::Overflow)?;
    let q = v
        .checked_add(RATIO_SCALE - 1)
        .ok_or(TminusError::Overflow)?
        / RATIO_SCALE;
    require!(q > 0, TminusError::UnderDelivery);
    require!(q <= u64::MAX as u128, TminusError::Overflow);
    Ok(q as u64)
}

fn tlv_extension<'a>(data: &'a [u8], wanted: u16) -> Option<&'a [u8]> {
    if data.len() <= MINT_BASE_LEN {
        return None;
    }
    let mut i = MINT_BASE_LEN + 1;
    while i + 4 <= data.len() {
        let ty = u16::from_le_bytes(data[i..i + 2].try_into().ok()?);
        let len = u16::from_le_bytes(data[i + 2..i + 4].try_into().ok()?) as usize;
        i += 4;
        if ty == 0 {
            break;
        }
        if i + len > data.len() {
            return None;
        }
        if ty == wanted {
            return Some(&data[i..i + len]);
        }
        i += len;
    }
    None
}

fn harvest_withheld_to_mint<'info>(
    _token_program: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    source: AccountInfo<'info>,
) -> Result<()> {
    if mint.data_len() <= MINT_BASE_LEN {
        return Ok(());
    }
    let ix = Instruction {
        program_id: TOKEN_2022_ID,
        accounts: vec![
            AccountMeta::new(mint.key(), false),
            AccountMeta::new(source.key(), false),
        ],
        data: vec![26, 4],
    };
    let _ = invoke(&ix, &[mint, source]);
    Ok(())
}

fn assert_src_mint_allowed(mint_info: &AccountInfo) -> Result<()> {
    require_keys_eq!(*mint_info.owner, TOKEN_2022_ID, TminusError::WrongTokenProgram);
    let data = mint_info.try_borrow_data()?;
    require!(data.len() >= MINT_BASE_LEN, TminusError::InvalidMint);
    if let Some(paused) = tlv_extension(&data, EXT_PAUSABLE_CONFIG) {
        require!(paused.len() >= 33, TminusError::InvalidMint);
        require!(paused[32] == 0, TminusError::Paused);
    }
    if let Some(hook) = tlv_extension(&data, EXT_TRANSFER_HOOK) {
        require!(hook.len() >= 64, TminusError::InvalidMint);
        let pid = &hook[32..64];
        require!(pid.iter().all(|b| *b == 0), TminusError::HookAttached);
    }
    Ok(())
}

fn return_remaining_and_close(accounts: &mut Cancel<'_>) -> Result<()> {
    require!(accounts.order.status == STATUS_OPEN, TminusError::StatusClosed);
    assert_src_mint_allowed(accounts.src_mint.as_ref())?;
    accounts.escrow_ata.reload()?;
    let remaining = accounts.escrow_ata.amount;
    let seeds: &[&[u8]] = &[
        ORDER_SEED,
        accounts.order.owner.as_ref(),
        accounts.order.src_mint.as_ref(),
        accounts.order.dst_mint.as_ref(),
        &accounts.order.nonce.to_le_bytes(),
        &[accounts.order.bump],
    ];
    if remaining > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                accounts.token_program.key(),
                TransferChecked {
                    from: accounts.escrow_ata.to_account_info(),
                    mint: accounts.src_mint.to_account_info(),
                    to: accounts.owner_src_ata.to_account_info(),
                    authority: accounts.order.to_account_info(),
                },
                &[seeds],
            ),
            remaining,
            accounts.src_mint.decimals,
        )?;
    }
    accounts.escrow_ata.reload()?;
    require!(accounts.escrow_ata.amount == 0, TminusError::FeeUnaccounted);
    harvest_withheld_to_mint(
        accounts.token_program.to_account_info(),
        accounts.src_mint.to_account_info(),
        accounts.escrow_ata.to_account_info(),
    )?;
    token_interface::close_account(CpiContext::new_with_signer(
        accounts.token_program.key(),
        CloseAccount {
            account: accounts.escrow_ata.to_account_info(),
            destination: accounts.owner.to_account_info(),
            authority: accounts.order.to_account_info(),
        },
        &[seeds],
    ))?;
    accounts.order.status = STATUS_CLOSED;
    emit!(OrderCancelled {
        order: accounts.order.key(),
        owner: accounts.order.owner,
    });
    Ok(())
}

fn return_remaining_and_close_expire(accounts: &mut Expire<'_>) -> Result<()> {
    require!(accounts.order.status == STATUS_OPEN, TminusError::StatusClosed);
    assert_src_mint_allowed(accounts.src_mint.as_ref())?;
    accounts.escrow_ata.reload()?;
    let remaining = accounts.escrow_ata.amount;
    let seeds: &[&[u8]] = &[
        ORDER_SEED,
        accounts.order.owner.as_ref(),
        accounts.order.src_mint.as_ref(),
        accounts.order.dst_mint.as_ref(),
        &accounts.order.nonce.to_le_bytes(),
        &[accounts.order.bump],
    ];
    if remaining > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                accounts.token_program.key(),
                TransferChecked {
                    from: accounts.escrow_ata.to_account_info(),
                    mint: accounts.src_mint.to_account_info(),
                    to: accounts.owner_src_ata.to_account_info(),
                    authority: accounts.order.to_account_info(),
                },
                &[seeds],
            ),
            remaining,
            accounts.src_mint.decimals,
        )?;
    }
    accounts.escrow_ata.reload()?;
    require!(accounts.escrow_ata.amount == 0, TminusError::FeeUnaccounted);
    harvest_withheld_to_mint(
        accounts.token_program.to_account_info(),
        accounts.src_mint.to_account_info(),
        accounts.escrow_ata.to_account_info(),
    )?;
    token_interface::close_account(CpiContext::new_with_signer(
        accounts.token_program.key(),
        CloseAccount {
            account: accounts.escrow_ata.to_account_info(),
            destination: accounts.owner.to_account_info(),
            authority: accounts.order.to_account_info(),
        },
        &[seeds],
    ))?;
    accounts.order.status = STATUS_CLOSED;
    emit!(OrderExpired {
        order: accounts.order.key(),
        owner: accounts.order.owner,
    });
    Ok(())
}

fn close_filled_escrow(ctx: &mut Context<Fill>) -> Result<()> {
    let owner_key = ctx.accounts.order.owner;
    let src = ctx.accounts.order.src_mint;
    let dst = ctx.accounts.order.dst_mint;
    let nonce_bytes = ctx.accounts.order.nonce.to_le_bytes();
    let bump = ctx.accounts.order.bump;
    let seeds: &[&[u8]] = &[
        ORDER_SEED,
        owner_key.as_ref(),
        src.as_ref(),
        dst.as_ref(),
        &nonce_bytes,
        &[bump],
    ];
    harvest_withheld_to_mint(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.src_mint.to_account_info(),
        ctx.accounts.escrow_ata.to_account_info(),
    )?;
    token_interface::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        CloseAccount {
            account: ctx.accounts.escrow_ata.to_account_info(),
            destination: ctx.accounts.owner.to_account_info(),
            authority: ctx.accounts.order.to_account_info(),
        },
        &[seeds],
    ))?;
    ctx.accounts.order.status = STATUS_CLOSED;
    ctx.accounts
        .order
        .close(ctx.accounts.owner.to_account_info())?;
    Ok(())
}

#[account]
#[derive(InitSpace)]
pub struct Order {
    pub owner: Pubkey,
    pub src_mint: Pubkey,
    pub dst_mint: Pubkey,
    pub escrow_ata: Pubkey,
    pub nonce: u64,
    pub src_decimals: u8,
    pub dst_decimals: u8,
    pub src_multiplier_e9: u64,
    pub escrowed_raw: u64,
    pub filled_raw: u64,
    pub min_ratio_e9: u64,
    pub failsafe_floor_e9: u64,
    pub failsafe_ts: i64,
    pub hard_expiry_ts: i64,
    pub min_fill_raw: u64,
    pub status: u8,
    pub bump: u8,
}


#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct Place<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + Order::INIT_SPACE,
        seeds = [
            ORDER_SEED,
            owner.key().as_ref(),
            src_mint.key().as_ref(),
            dst_mint.key().as_ref(),
            &nonce.to_le_bytes()
        ],
        bump
    )]
    pub order: Account<'info, Order>,
    pub src_mint: InterfaceAccount<'info, Mint>,
    pub dst_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = src_mint,
        token::authority = owner,
        token::token_program = token_program
    )]
    pub owner_src_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = src_mint,
        associated_token::authority = order,
        associated_token::token_program = token_program
    )]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner,
        has_one = src_mint,
        has_one = escrow_ata,
        seeds = [
            ORDER_SEED,
            owner.key().as_ref(),
            src_mint.key().as_ref(),
            order.dst_mint.as_ref(),
            &order.nonce.to_le_bytes()
        ],
        bump = order.bump,
        close = owner
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub src_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = src_mint,
        token::authority = owner,
        token::token_program = token_program
    )]
    pub owner_src_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Fill<'info> {
    #[account(mut)]
    pub filler: Signer<'info>,
    /// CHECK: destination of rent on full fill; must match order.owner
    #[account(mut, address = order.owner)]
    pub owner: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = src_mint,
        has_one = dst_mint,
        has_one = escrow_ata,
        seeds = [
            ORDER_SEED,
            order.owner.as_ref(),
            src_mint.key().as_ref(),
            dst_mint.key().as_ref(),
            &order.nonce.to_le_bytes()
        ],
        bump = order.bump
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub src_mint: InterfaceAccount<'info, Mint>,
    pub dst_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = dst_mint,
        token::authority = owner,
        token::token_program = dst_token_program
    )]
    pub owner_dst_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = src_mint,
        token::authority = filler,
        token::token_program = token_program
    )]
    pub filler_src_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = dst_mint,
        token::authority = filler,
        token::token_program = dst_token_program
    )]
    pub filler_dst_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub dst_token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Expire<'info> {
    /// CHECK: anyone may expire; rent returns to owner
    #[account(mut, address = order.owner)]
    pub owner: UncheckedAccount<'info>,
    pub crank: Signer<'info>,
    #[account(
        mut,
        has_one = src_mint,
        has_one = escrow_ata,
        seeds = [
            ORDER_SEED,
            order.owner.as_ref(),
            src_mint.key().as_ref(),
            order.dst_mint.as_ref(),
            &order.nonce.to_le_bytes()
        ],
        bump = order.bump,
        close = owner
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub src_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = src_mint,
        token::authority = owner,
        token::token_program = token_program
    )]
    pub owner_src_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct OrderPlaced {
    pub order: Pubkey,
    pub owner: Pubkey,
    pub src_mint: Pubkey,
    pub dst_mint: Pubkey,
    pub escrowed_raw: u64,
    pub min_ratio_e9: u64,
    pub failsafe_floor_e9: u64,
    pub failsafe_ts: i64,
    pub hard_expiry_ts: i64,
}

#[event]
pub struct OrderCancelled {
    pub order: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct OrderFilled {
    pub order: Pubkey,
    pub filler: Pubkey,
    pub src_delta: u64,
    pub dst_delta: u64,
    pub ratio_e9: u64,
    pub failsafe_used: bool,
}

#[event]
pub struct OrderExpired {
    pub order: Pubkey,
    pub owner: Pubkey,
}

#[error_code]
pub enum TminusError {
    #[msg("Paused mint")]
    Paused,
    #[msg("Transfer hook is attached")]
    HookAttached,
    #[msg("Post-fee amount mismatch")]
    FeeUnaccounted,
    #[msg("Fill under-delivers destination tokens")]
    UnderDelivery,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Order is closed")]
    StatusClosed,
    #[msg("Too early to expire")]
    TooEarlyExpire,
    #[msg("Fill below minimum")]
    FillTooSmall,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Invalid ratio")]
    InvalidRatio,
    #[msg("Invalid timestamps")]
    InvalidTimestamps,
    #[msg("Source and destination mints must differ")]
    MintsMustDiffer,
    #[msg("Wrong token program")]
    WrongTokenProgram,
    #[msg("Invalid mint account")]
    InvalidMint,
    #[msg("Insufficient escrow")]
    InsufficientEscrow,
    #[msg("Past hard expiry; use expire")]
    HardExpired,
    #[msg("Place-time multiplier disagrees with live mint; v1 pins at place")]
    StaleMultiplier,
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn ceil_ratio_identity() {
        assert_eq!(ceil_ratio(100, 1_000_000_000).unwrap(), 100);
    }

    #[test]
    fn ceil_ratio_rounds_up() {
        assert_eq!(ceil_ratio(3, 500_000_000).unwrap(), 2);
    }

    #[test]
    fn ceil_ratio_rejects_zero_out() {
        assert!(ceil_ratio(1, 0).is_err());
    }

    #[test]
    fn ceil_ratio_overflow_inputs() {
        assert!(ceil_ratio(u64::MAX, u64::MAX).is_err());
    }

    #[test]
    fn ceil_ratio_tiny_ratio_still_positive() {
        assert_eq!(ceil_ratio(2, 1).unwrap(), 1);
    }
}
