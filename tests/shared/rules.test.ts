import { describe, expect, it } from "vitest";
import { defaultSettings } from "../../src/shared/defaults";
import { matchLocalRules } from "../../src/shared/rules";

describe("matchLocalRules", () => {
  it("matches built-in hate keywords", () => {
    const result = matchLocalRules("violent slur example", defaultSettings);
    expect(result?.category).toBe("hate");
  });

  it("matches custom keywords", () => {
    const settings = {
      ...defaultSettings,
      customKeywords: ["brainrot take"],
    };

    const result = matchLocalRules("what a brainrot take", settings);
    expect(result?.reason).toContain("custom");
  });
});
