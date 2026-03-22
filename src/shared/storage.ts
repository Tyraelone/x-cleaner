import { createDefaultSettings } from "./defaults";
import type { Settings, SettingsPatch } from "./types";

const settingsStorageKey = "settings";
const apiKeyStorageKey = "apiKey";

interface ChromeStorageArea {
  get(keys?: null | string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

interface ChromeStorageLike {
  storage: {
    local: ChromeStorageArea;
    sync: ChromeStorageArea;
  };
}

function getChromeStorageArea(area: keyof ChromeStorageLike["storage"]): ChromeStorageArea {
  const chromeApi = globalThis as typeof globalThis & { chrome?: ChromeStorageLike };
  const storageArea = chromeApi.chrome?.storage[area];

  if (!storageArea) {
    throw new Error(`chrome.storage.${area} is not available`);
  }

  return storageArea;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractStoredSettings(record: Record<string, unknown>): SettingsPatch {
  const storedSettings = record[settingsStorageKey];

  if (isRecord(storedSettings)) {
    const { [settingsStorageKey]: _ignored, ...rest } = record;
    return {
      ...(rest as SettingsPatch),
      ...(storedSettings as SettingsPatch),
    };
  }

  return record as SettingsPatch;
}

export function mergeWithDefaults(partialSettings: SettingsPatch = {}): Settings {
  const defaults = createDefaultSettings();

  return {
    ai: {
      ...defaults.ai,
      ...(partialSettings.ai ?? {}),
    },
    confidenceThreshold:
      partialSettings.confidenceThreshold ?? defaults.confidenceThreshold,
    categories: {
      ...defaults.categories,
      ...(partialSettings.categories ?? {}),
    },
    allowlist: [...(partialSettings.allowlist ?? defaults.allowlist)],
    blacklist: [...(partialSettings.blacklist ?? defaults.blacklist)],
    customKeywords: [...(partialSettings.customKeywords ?? defaults.customKeywords)],
  };
}

export async function getSettings(): Promise<Settings> {
  const rawSettings = await getChromeStorageArea("sync").get(null);
  return mergeWithDefaults(extractStoredSettings(rawSettings));
}

export async function saveSettings(settings: SettingsPatch): Promise<void> {
  const mergedSettings = mergeWithDefaults(settings);

  await getChromeStorageArea("sync").set(mergedSettings);
}

export async function getApiKey(): Promise<string | null> {
  const stored = await getChromeStorageArea("local").get(apiKeyStorageKey);
  const apiKey = stored[apiKeyStorageKey];

  return typeof apiKey === "string" && apiKey.length > 0 ? apiKey : null;
}

export async function saveApiKey(key: string): Promise<void> {
  await getChromeStorageArea("local").set({
    [apiKeyStorageKey]: key,
  });
}
