import { describe, expect, it } from "vitest";
import { defaultSettings } from "../../src/shared/defaults";

describe("default settings", () => {
  it("enables local filtering and disables AI by default", () => {
    expect(defaultSettings.ai.enabled).toBe(false);
    expect(defaultSettings.categories.hate).toBe(true);
  });
});
