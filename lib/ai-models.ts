/**
 * AI Model Configuration
 * Defines available AI models for the chat interface with their capabilities.
 */

export interface AIModel {
  id: string; // OpenRouter model ID
  name: string; // Display name
  provider: string; // Provider name (e.g., "OpenAI")
  providerSlug: string; // For logo lookup (e.g., "openai")
  supportsVision: boolean; // Whether model can process images
}

/**
 * Available AI models via OpenRouter
 * Models are grouped by provider for the selector UI
 */
export const AI_MODELS: AIModel[] = [
  // Google (default: Gemini 3.5 Flash)
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google",
    providerSlug: "google",
    supportsVision: true,
  },

  // Moonshot AI
  {
    id: "moonshotai/kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    provider: "Moonshot AI",
    providerSlug: "moonshotai",
    supportsVision: true,
  },

  // MiniMax
  {
    id: "minimax/minimax-m3",
    name: "MiniMax M3",
    provider: "MiniMax",
    providerSlug: "minimax",
    supportsVision: true,
  },
];

/** Default model ID - Google Gemini 3.5 Flash */
export const DEFAULT_MODEL_ID = "google/gemini-3.5-flash";

/**
 * Get a model by its ID
 */
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

/**
 * Get models grouped by provider for the selector UI
 */
export function getModelsByProvider(): Record<string, AIModel[]> {
  return AI_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);
}

/**
 * Get unique provider names in display order
 */
export function getProviders(): string[] {
  const providers = new Set(AI_MODELS.map((m) => m.provider));
  return Array.from(providers);
}

/**
 * Check if a model supports vision (image processing)
 */
export function modelSupportsVision(modelId: string): boolean {
  const model = getModelById(modelId);
  return model?.supportsVision ?? false;
}
