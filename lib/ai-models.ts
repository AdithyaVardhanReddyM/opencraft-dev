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
  // xAI (default) - free tier doesn't support vision
  {
    id: "x-ai/grok-4.1-fast:free",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    providerSlug: "xai",
    supportsVision: false,
  },

  // OpenAI
  {
    id: "openai/gpt-5.1",
    name: "GPT-5.1",
    provider: "OpenAI",
    providerSlug: "openai",
    supportsVision: true,
  },

  // Anthropic
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    providerSlug: "anthropic",
    supportsVision: true,
  },

  // Google
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "Google",
    providerSlug: "google",
    supportsVision: true,
  },
];

/** Default model ID - xAI Grok */
export const DEFAULT_MODEL_ID = "x-ai/grok-4.1-fast:free";

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
