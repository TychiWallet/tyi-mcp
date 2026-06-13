export type LlmProvider = "anthropic" | "gemini" | "openai" | "groq";

export type OnboardMode = "fresh" | "llm_only";

export type OnboardInput = {
  password: string;
  agent_name?: string;
  llm_provider: LlmProvider;
  llm_api_key: string;
  mnemonic?: string;
};

export type ReadinessSnapshot = {
  ready: boolean;
  missing: string[];
  mode: OnboardMode | "ready";
  data_dir: string;
  brain_url: string;
  wallet?: {
    name: string;
    evm_address: string | null;
    sol_address: string | null;
    sui_address: string | null;
  };
  hints: string[];
};
