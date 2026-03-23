// @vitest-environment jsdom

import { fireEvent, getByLabelText, getByRole, getByText } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { renderSettingsForm } from "../../src/options/settings-form";
import { createDefaultSettings } from "../../src/shared/defaults";

describe("renderSettingsForm", () => {
  it("renders category toggles and AI settings", () => {
    document.body.innerHTML = '<div id="app"></div>';

    renderSettingsForm(document.getElementById("app")!, createDefaultSettings(), {
      onSave: vi.fn(),
    });

    expect(getByText(document.body, "Built-in categories")).toBeTruthy();
    expect(getByText(document.body, "AI settings")).toBeTruthy();
    expect(getByLabelText(document.body, "Hate")).toBeTruthy();
    expect(getByLabelText(document.body, "Harassment")).toBeTruthy();
    expect(getByLabelText(document.body, "AI enabled")).toBeTruthy();
    expect(getByLabelText(document.body, "Provider")).toBeTruthy();
    expect(getByLabelText(document.body, "Model")).toBeTruthy();
    expect(getByLabelText(document.body, "API key")).toBeTruthy();
    expect(getByLabelText(document.body, "Debug logging")).toBeTruthy();
    expect(getByText(document.body, "Volcengine Ark")).toBeTruthy();
  });

  it("saves updates through a callback", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const onSave = vi.fn();

    renderSettingsForm(document.getElementById("app")!, createDefaultSettings(), {
      onSave,
    });

    fireEvent.click(getByLabelText(document.body, "Hate"));
    fireEvent.click(getByLabelText(document.body, "AI enabled"));
    fireEvent.change(getByLabelText(document.body, "Provider"), {
      target: { value: "openai" },
    });
    fireEvent.input(getByLabelText(document.body, "Model"), {
      target: { value: "gpt-4o-mini" },
    });
    fireEvent.input(getByLabelText(document.body, "API key"), {
      target: { value: "secret-key" },
    });
    fireEvent.input(getByLabelText(document.body, "Allowlist"), {
      target: { value: "friend\nally" },
    });
    fireEvent.input(getByLabelText(document.body, "Blacklist"), {
      target: { value: "spammer" },
    });
    fireEvent.input(getByLabelText(document.body, "Custom keywords"), {
      target: { value: "brainrot\nragebait" },
    });
    fireEvent.click(getByRole(document.body, "button", { name: "Save settings" }));

    expect(onSave).toHaveBeenCalledWith({
      settings: {
        ai: {
          enabled: true,
          provider: "openai",
          model: "gpt-4o-mini",
        },
        confidenceThreshold: 0.8,
        debug: false,
        categories: {
          hate: false,
          harassment: true,
          sexual: true,
          violence: true,
          spam: true,
        },
        allowlist: ["friend", "ally"],
        blacklist: ["spammer"],
        customKeywords: ["brainrot", "ragebait"],
      },
      apiKey: "secret-key",
    });
  });

  it("resets to the latest saved values after a successful save", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const onSave = vi.fn().mockResolvedValue(undefined);

    const form = renderSettingsForm(document.getElementById("app")!, createDefaultSettings(), {
      onSave,
    });

    fireEvent.click(getByLabelText(document.body, "Hate"));
    fireEvent.click(getByRole(document.body, "button", { name: "Save settings" }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.click(getByLabelText(document.body, "Hate"));
    fireEvent.click(getByRole(document.body, "button", { name: "Reset" }));

    expect((getByLabelText(document.body, "Hate") as HTMLInputElement).checked).toBe(false);
    expect(form).toBeTruthy();
  });

  it("saves the volcengine ark provider", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const onSave = vi.fn();

    renderSettingsForm(document.getElementById("app")!, createDefaultSettings(), {
      onSave,
    });

    fireEvent.change(getByLabelText(document.body, "Provider"), {
      target: { value: "ark" },
    });
    fireEvent.input(getByLabelText(document.body, "Model"), {
      target: { value: "doubao-seed-1-6-250615" },
    });
    fireEvent.click(getByRole(document.body, "button", { name: "Save settings" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          ai: {
            enabled: false,
            provider: "ark",
            model: "doubao-seed-1-6-250615",
          },
        }),
      }),
    );
  });

  it("saves the debug logging toggle", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const onSave = vi.fn();

    renderSettingsForm(document.getElementById("app")!, createDefaultSettings(), {
      onSave,
    });

    fireEvent.click(getByLabelText(document.body, "Debug logging"));
    fireEvent.click(getByRole(document.body, "button", { name: "Save settings" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          debug: true,
        }),
      }),
    );
  });
});
