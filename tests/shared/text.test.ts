import { describe, expect, it } from "vitest";
import { fingerprintText, normalizeText } from "../../src/shared/text";

describe("normalizeText", () => {
  it("lowercases and compresses repeated punctuation", () => {
    expect(normalizeText("IDIOTS!!!  ")).toBe("idiots!");
  });
});

describe("fingerprintText", () => {
  it("returns the same fingerprint for equivalent normalized text", () => {
    expect(fingerprintText("Hello!!!")).toBe(fingerprintText("hello!"));
  });
});
