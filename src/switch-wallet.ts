import { loadWallet, setCurrentPassword, switchWallet } from "@tychilabs/tyi";
import {
  getEvmAddress,
  getSolAddress,
  getSuiAddress,
  getWalletName,
} from "@tychilabs/tyi";
import { walletAddressResult } from "./chains.js";

function requirePassword(): string {
  const pw = process.env.TYI_PASSWORD?.trim() || process.env.KEYSTORE_PASSWORD?.trim();
  if (!pw) throw new Error("TYI_PASSWORD env required");
  return pw;
}

export async function runSwitchWallet(name: string): Promise<Record<string, unknown>> {
  const trimmed = name?.trim();
  if (!trimmed) throw new Error("name is required");

  const password = requirePassword();
  await loadWallet(password);
  setCurrentPassword(password);
  switchWallet(trimmed);
  await loadWallet(password);

  return {
    ok: true,
    wallet_name: getWalletName(),
    ...walletAddressResult(getEvmAddress(), getSolAddress(), getSuiAddress()),
  };
}
