import { describe, expect, it } from "vitest";
import {
  builtInCategories,
  createDefaultSettings,
  defaultConfidenceThreshold,
  defaultSettings,
} from "../../src/shared/defaults";

describe("default settings", () => {
  it("exports the expected default contract", () => {
    expect(defaultSettings.ai.enabled).toBe(false);
    expect(defaultSettings.confidenceThreshold).toBe(defaultConfidenceThreshold);
    expect(defaultSettings.categories).toEqual(builtInCategories);
    expect(defaultSettings.categories.hate).toBe(true);
    expect(defaultSettings.categories.harassment).toBe(true);
    expect(defaultSettings.categories.sexual).toBe(true);
    expect(defaultSettings.categories.violence).toBe(true);
    expect(defaultSettings.categories.spam).toBe(true);
    expect(defaultSettings.allowlist).toEqual([]);
    expect(defaultSettings.blacklist).toEqual([]);
    expect(defaultSettings.customKeywords).toEqual([]);
  });

  it("returns fresh mutable settings from the factory", () => {
    const first = createDefaultSettings();
    const second = createDefaultSettings();

    expect(first).not.toBe(second);
    expect(first.ai).not.toBe(second.ai);
    expect(first.categories).not.toBe(second.categories);
    expect(first.allowlist).not.toBe(second.allowlist);
    expect(first.blacklist).not.toBe(second.blacklist);
    expect(first.customKeywords).not.toBe(second.customKeywords);

    first.ai.enabled = true;
    first.categories.hate = false;
    first.allowlist.push("foo");
    first.blacklist.push("bar");
    first.customKeywords.push("baz");

    expect(second.ai.enabled).toBe(false);
    expect(second.categories.hate).toBe(true);
    expect(second.allowlist).toEqual([]);
    expect(second.blacklist).toEqual([]);
    expect(second.customKeywords).toEqual([]);
  });
});
