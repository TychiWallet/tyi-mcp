import { createWalletForKinds, loadWallet, setCurrentPassword } from "@tychilabs/tyi";
import { loadSupportedChains, supportedChainKinds, walletAddressResult } from "./chains.js";

function requirePassword(): string {
  const pw = process.env.TYI_PASSWORD?.trim() || process.env.KEYSTORE_PASSWORD?.trim();
  if (!pw) throw new Error("TYI_PASSWORD env required");
  return pw;
}

export type CreateWalletInput = {
  name: string;
  label?: string;
};

export type CreateWalletResult = {
  ok: true;
  wallet_name: string;
  evm_address?: string;
  sol_address?: string;
  sui_address?: string;
  /** Shown once — operator must save offline. */
  mnemonic: string;
  hint: string;
};

/** MCP-fast create — no brain loop, no UGF MCP spawn. */
export async function runCreateWallet(input: CreateWalletInput): Promise<CreateWalletResult> {
  const name = input.name?.trim();
  if (!name) throw new Error("name is required");
  if (name === "primary") throw new Error('name "primary" is reserved');

  const password = requirePassword();
  await loadSupportedChains();
  await loadWallet(password);
  setCurrentPassword(password);

  const label = input.label?.trim() || name;
  const out = createWalletForKinds(name, label, password, supportedChainKinds());
  const addrs = walletAddressResult(out.evmAddress, out.solAddress, out.suiAddress);

  return {
    ok: true,
    wallet_name: name,
    evm_address: addrs.evm_address as string | undefined,
    sol_address: addrs.sol_address as string | undefined,
    sui_address: addrs.sui_address as string | undefined,
    mnemonic: out.mnemonic,
    hint: "Save mnemonic offline. Active wallet unchanged — tyi_switch_wallet to activate.",
  };
}
