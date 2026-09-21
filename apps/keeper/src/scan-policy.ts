export function shouldScanProgramAccounts(info: { executable: boolean } | null): boolean {
  return Boolean(info?.executable);
}
