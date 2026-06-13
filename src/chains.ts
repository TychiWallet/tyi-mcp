import { getBrainUrl } from "@tychilabs/tyi";
import type { ChainKindForWallet } from "@tychilabs/tyi";

type SupportedChain = {
  key: string;
  id: string;
  kind: ChainKindForWallet;
  name: string;
};

let cached: SupportedChain[] | null = null;

export async function loadSupportedChains(): Promise<SupportedChain[]> {
  if (cached) return cached;
  const res = await fetch(`${getBrainUrl()}/v1/chains`);
  if (!res.ok) {
    throw new Error(`brain chains failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { chains?: SupportedChain[] };
  if (!Array.isArray(body.chains) || body.chains.length === 0) {
    throw new Error("brain chains: invalid or empty response");
  }
  cached = body.chains;
  return cached;
}

export function supportedChainKinds(): ChainKindForWallet[] {
  if (!cached) throw new Error("supported chains not loaded");
  const seen = new Set<ChainKindForWallet>();
  const kinds: ChainKindForWallet[] = [];
  for (const c of cached) {
    if (seen.has(c.kind)) continue;
    seen.add(c.kind);
    kinds.push(c.kind);
  }
  return kinds;
}

export function formatSupportedChainsLine(): string {
  return cached?.map((c) => `${c.name} (${c.id})`).join(", ") ?? "";
}

export function supportsEvm(): boolean {
  return supportedChainKinds().includes("evm");
}

export function supportsSol(): boolean {
  return supportedChainKinds().includes("sol");
}

export function supportsSui(): boolean {
  return supportedChainKinds().includes("sui");
}

export type ImportWalletKind = "mnemonic" | "evm_privkey" | "sol_privkey" | "sui_privkey";

export function assertImportKindSupported(kind: ImportWalletKind): void {
  if (kind === "evm_privkey" && !supportsEvm()) {
    throw new Error("EVM import not supported — brain chains registry has no EVM");
  }
  if (kind === "sol_privkey" && !supportsSol()) {
    throw new Error("Solana import not supported — brain chains registry has no Solana");
  }
  if (kind === "sui_privkey" && !supportsSui()) {
    throw new Error("Sui import not supported — brain chains registry has no Sui");
  }
}

function walletAddressResult(
  evm: string | null | undefined,
  sol: string | null | undefined,
  sui: string | null | undefined,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(extra ?? {}) };
  if (supportsEvm() && evm) out.evm_address = evm;
  if (supportsSol() && sol) out.sol_address = sol;
  if (supportsSui() && sui) out.sui_address = sui;
  return out;
}

export { walletAddressResult };
