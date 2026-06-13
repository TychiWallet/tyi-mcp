import fs from "node:fs";
import path from "node:path";
import { ensureDirs, PATHS } from "@tychilabs/tyi";
import { getBrainUrl } from "@tychilabs/tyi";
import { ensureBrainJwt } from "./brain-auth.js";
import type { LlmProvider } from "./types.js";

const LLM_CONFIG_PATH = path.join(PATHS.config, "llm.json");

const DEFAULT_MODEL: Record<LlmProvider, string> = {
  anthropic: "claude-opus-4-7",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o",
  groq: "llama-3.3-70b-versatile",
};

type LlmStatusResponse = {
  configured_providers: string[];
  provider?: string;
  model?: string | null;
};

async function authedJson<T>(password: string, apiPath: string, init?: RequestInit): Promise<T> {
  const jwt = await ensureBrainJwt(password);
  const res = await fetch(`${getBrainUrl()}${apiPath}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${jwt}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`brain ${apiPath} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export function writeLocalLlmPrefs(provider: LlmProvider, model?: string): void {
  ensureDirs();
  fs.writeFileSync(
    LLM_CONFIG_PATH,
    JSON.stringify({ provider, model: model ?? DEFAULT_MODEL[provider] }, null, 2) + "\n",
    "utf8",
  );
}

export async function brainGetLlmStatus(password: string): Promise<LlmStatusResponse> {
  return authedJson<LlmStatusResponse>(password, "/v1/llm/status");
}

export async function brainHasLlmKey(password: string): Promise<boolean> {
  try {
    const s = await brainGetLlmStatus(password);
    return s.configured_providers.length > 0;
  } catch {
    return false;
  }
}

export async function brainSaveLlmKey(
  password: string,
  provider: LlmProvider,
  apiKey: string,
): Promise<void> {
  await authedJson<{ ok: boolean }>(password, "/v1/llm/key", {
    method: "PUT",
    body: JSON.stringify({ provider, api_key: apiKey }),
  });
  const model = DEFAULT_MODEL[provider];
  await authedJson<{ ok: boolean }>(password, "/v1/llm/prefs", {
    method: "PUT",
    body: JSON.stringify({ provider, model }),
  });
  writeLocalLlmPrefs(provider, model);
}
