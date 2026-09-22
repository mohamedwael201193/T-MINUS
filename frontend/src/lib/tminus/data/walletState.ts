import type { WalletBalance, WalletProviderOption } from "../domain/types";

/**
 * Wallet design state.
 *
 * INTEGRATION POINT — swap for a real wallet adapter (window.solana /
        wallet-adapter-react) behind WalletSource. No keys, signatures
 * or transactions exist in this design state — connection is a local
 * visual state only.
 */

export const DESIGN_WALLET_ADDRESS = "7xKQv2mFcP4x9zLhT8dR3nWbY5aJ2uE6sH1oPqD9fDm";

export const DESIGN_WALLET_BALANCES: WalletBalance = {
  SPACEX: 12.5,
  SPCXx: 0,
  USDC: 2_450.12,
  SOL: 1.5,
  spacexRaw: String(12.5 * 200_000_000),
};

export const WALLET_PROVIDERS: WalletProviderOption[] = [
  { id: "phantom", name: "Phantom" },
  { id: "solflare", name: "Solflare" },
  { id: "backpack", name: "Backpack" },
];
