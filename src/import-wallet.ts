import {
  importEvmWallet,
  importMnemonicForKinds,
  importSolanaFromPrivateKey,
  importSuiFromPrivateKey,
  loadWallet,
  setCurrentPassword,
} from "@tychilabs/tyi";
import {
  assertImportKindSupported,
  loadSupportedChains,
  supportedChainKinds,
  walletAddressResult,
  type ImportWalletKind,
} from "./chains.js";

function requirePassword(password?: string): string {
  const pw =
    password?.trim() ||
    process.env.TYI_PASSWORD?.trim() ||
    process.env.KEYSTORE_PASSWORD?.trim();
  if (!pw) throw new Error("TYI_PASSWORD env required (or pass password in tool)");
  return pw;
}

export type ImportWalletInput = {
  name: string;
  kind: ImportWalletKind;
  secret: string;
  label?: string;
  password?: string;
};

export type ImportWalletResult = {
  ok: true;
  wallet_name: string;
  kind: ImportWalletKind;
  evm_address?: string;
  sol_address?: string;
  sui_address?: string;
  hint: string;
};

/** MCP-local import — secrets via tool param, not tyi_chat (no CLI masked prompt). */
export async function runImportWallet(input: ImportWalletInput): Promise<ImportWalletResult> {
  const name = input.name?.trim();
  if (!name) throw new Error("name is required");

  const secret = input.secret?.trim();
  if (!secret) throw new Error("secret is required");

  const kind = input.kind;
  assertImportKindSupported(kind);

  const password = requirePassword(input.password);
  await loadSupportedChains();
  await loadWallet(password);
  setCurrentPassword(password);

  const label = input.label?.trim() || name;

  if (kind === "mnemonic") {
    const out = importMnemonicForKinds(name, label, secret, password, supportedChainKinds());
    const result = walletAddressResult(out.evmAddress, out.solAddress, out.suiAddress, {
      wallet_name: name,
    });
    return {
      ok: true,
      wallet_name: name,
      kind,
      evm_address: result.evm_address as string | undefined,
      sol_address: result.sol_address as string | undefined,
      sui_address: result.sui_address as string | undefined,
      hint: "Imported. tyi_switch_wallet to activate.",
    };
  }

  if (kind === "evm_privkey") {
    const out = importEvmWallet(name, label, secret, password);
    const result = walletAddressResult(out.address, null, null, { wallet_name: name });
    return {
      ok: true,
      wallet_name: name,
      kind,
      evm_address: result.evm_address as string | undefined,
      hint: "Imported. tyi_switch_wallet to activate.",
    };
  }

  if (kind === "sui_privkey") {
    const out = importSuiFromPrivateKey(name, label, secret, password);
    const result = walletAddressResult(null, null, out.address, { wallet_name: name });
    return {
      ok: true,
      wallet_name: name,
      kind,
      sui_address: result.sui_address as string | undefined,
      hint: "Imported. tyi_switch_wallet to activate.",
    };
  }

  const out = await importSolanaFromPrivateKey(name, label, secret, password);
  const result = walletAddressResult(null, out.address, null, { wallet_name: name });
  return {
    ok: true,
    wallet_name: name,
    kind,
    sol_address: result.sol_address as string | undefined,
    hint: "Imported. Tell operator to switch with tyi_chat: switch to " + name,
  };
}
