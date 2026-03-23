import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDebugLogger } from "../../src/shared/debug";

describe("createDebugLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not log when debug is disabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const logger = createDebugLogger("content", { debug: false });

    logger("scan-start", { candidateId: "post-1" });

    expect(info).not.toHaveBeenCalled();
  });

  it("logs structured entries when debug is enabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const logger = createDebugLogger("background", { debug: true });

    logger("provider-response", { provider: "ark", blocked: true });

    expect(info).toHaveBeenCalledWith("[X Cleaner][background] provider-response", {
      blocked: true,
      provider: "ark",
    });
  });
});
