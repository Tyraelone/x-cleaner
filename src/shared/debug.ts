export type DebugContext = "content" | "background" | "classifier" | "storage";

export interface DebugSettingsLike {
  debug: boolean;
}

export function createDebugLogger(
  context: DebugContext,
  settings: DebugSettingsLike,
): (event: string, payload?: Record<string, unknown>) => void {
  return (event, payload = {}) => {
    if (!settings.debug) {
      return;
    }

    console.info(`[X Cleaner][${context}] ${event}`, payload);
  };
}
