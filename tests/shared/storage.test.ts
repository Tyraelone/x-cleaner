import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSettings, mergeWithDefaults } from "../../src/shared/storage";

describe("mergeWithDefaults", () => {
  it("fills missing nested settings with defaults", () => {
    const merged = mergeWithDefaults({ ai: { enabled: true } });
    expect(merged.ai.enabled).toBe(true);
    expect(merged.categories.hate).toBe(true);
  });
});

describe("getSettings", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", {
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({}),
        },
      },
    });
  });

  it("returns defaults when storage is empty", async () => {
    const settings = await getSettings();
    expect(settings.ai.enabled).toBe(false);
  });
});
