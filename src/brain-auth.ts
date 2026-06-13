import fs from "node:fs";
import path from "node:path";
import {
  ensureTyiIdentity,
  listKeystoreEvmAddresses,
  PATHS,
} from "@tychilabs/tyi";
import { getBrainUrl } from "@tychilabs/tyi";

const AUTH_SIGN_PREFIX = "Tychi auth: ";
const BRAIN_JWT_FILE = path.join(PATHS.dir, ".brain-jwt.json");

type CachedJwt = {
  jwt: string;
  exp: number;
  tyi_pubkey: string;
};

function buildAuthMessage(nonce: string): string {
  return AUTH_SIGN_PREFIX + nonce;
}

function readCachedJwt(): CachedJwt | null {
  try {
    if (!fs.existsSync(BRAIN_JWT_FILE)) return null;
    const j = JSON.parse(fs.readFileSync(BRAIN_JWT_FILE, "utf8")) as CachedJwt;
    if (j.exp <= Math.floor(Date.now() / 1000) + 30) return null;
    if (!j.tyi_pubkey || !j.jwt) return null;
    return j;
  } catch {
    return null;
  }
}

function writeCachedJwt(j: CachedJwt): void {
  fs.mkdirSync(path.dirname(BRAIN_JWT_FILE), { recursive: true });
  fs.writeFileSync(BRAIN_JWT_FILE, JSON.stringify(j, null, 2), { mode: 0o600 });
}

/** Brain JWT via Tyi identity — required for LLM vault API. */
export async function ensureBrainJwt(password: string): Promise<string> {
  const identity = ensureTyiIdentity(password);
  const cached = readCachedJwt();
  if (cached && cached.tyi_pubkey === identity.pubkeyBase64) return cached.jwt;

  const base = getBrainUrl();
  const nonceRes = await fetch(`${base}/v1/auth/nonce`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tyi_pubkey: identity.pubkeyBase64 }),
  });
  if (!nonceRes.ok) throw new Error(`brain auth nonce failed: ${nonceRes.status}`);
  const { nonce } = (await nonceRes.json()) as { nonce: string };

  const signature = identity.sign(buildAuthMessage(nonce));
  const verifyRes = await fetch(`${base}/v1/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tyi_pubkey: identity.pubkeyBase64,
      nonce,
      signature,
      link_evm_addresses: listKeystoreEvmAddresses(),
    }),
  });
  if (!verifyRes.ok) throw new Error(`brain auth verify failed: ${verifyRes.status}`);
  const body = (await verifyRes.json()) as { jwt: string; exp: number };
  writeCachedJwt({ jwt: body.jwt, exp: body.exp, tyi_pubkey: identity.pubkeyBase64 });
  return body.jwt;
}
