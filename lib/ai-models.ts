/**
 * AI Model Configuration
 * Defines available AI models for the chat interface with their capabilities.
 */

export interface AIModel {
  id: string; // UI model id (mapped to a Gemini model id by the agent-service)
  name: string; // Display name
  provider: string; // Provider name (e.g., "Google")
  providerSlug: string; // For logo lookup (e.g., "google")
  supportsVision: boolean; // Whether model can process images
}

/**
 * Available models. The agent-service maps these UI ids to a Google Gemini model
 * id (see agent-service config.py MODEL_ID_MAP). Gemini 3.1 Pro is the only model.
 */
export const AI_MODELS: AIModel[] = [
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    provider: "Google",
    providerSlug: "google",
    supportsVision: true,
  },
];

/** Default model ID - Google Gemini 3.1 Pro (preview, via the agent-service) */
export const DEFAULT_MODEL_ID = "google/gemini-3.1-pro-preview";

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
