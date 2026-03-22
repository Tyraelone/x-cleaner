import type { AiProvider, FilterCategory, Settings } from "../shared/types";

export interface SettingsFormState extends Settings {
  apiKey?: string;
}

export interface SettingsFormSubmitPayload {
  settings: Settings;
  apiKey: string;
}

export interface SettingsFormHandlers {
  onSave: (payload: SettingsFormSubmitPayload) => void | Promise<void>;
}

interface SettingsSnapshot extends Settings {
  apiKey: string;
}

const categoryLabels: Record<FilterCategory, string> = {
  hate: "Hate",
  harassment: "Harassment",
  sexual: "Sexual",
  violence: "Violence",
  spam: "Spam",
};

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join("\n");
}

function createField(labelText: string, control: HTMLElement): HTMLLabelElement {
  const field = document.createElement("label");
  field.className = "field";

  const label = document.createElement("span");
  label.className = "field__label";
  label.textContent = labelText;

  field.append(label, control);

  return field;
}

function createCheckbox(id: string, checked: boolean): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  return input;
}

function createTextInput(id: string, value: string, type = "text"): HTMLInputElement {
  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.value = value;
  return input;
}

function createTextArea(id: string, value: string): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.value = value;
  return textarea;
}

function createSection(title: string): HTMLFieldSetElement {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = title;
  fieldset.append(legend);
  return fieldset;
}

function renderCheckboxRow(
  labelText: string,
  id: string,
  checked: boolean,
): { wrapper: HTMLLabelElement; input: HTMLInputElement } {
  const wrapper = document.createElement("label");
  wrapper.className = "checkbox-row";
  wrapper.setAttribute("for", id);

  const input = createCheckbox(id, checked);
  const text = document.createElement("span");
  text.textContent = labelText;

  wrapper.append(input, text);

  return { wrapper, input };
}

function cloneSnapshot(snapshot: SettingsSnapshot): SettingsSnapshot {
  return {
    ai: {
      ...snapshot.ai,
    },
    confidenceThreshold: snapshot.confidenceThreshold,
    categories: {
      ...snapshot.categories,
    },
    allowlist: [...snapshot.allowlist],
    blacklist: [...snapshot.blacklist],
    customKeywords: [...snapshot.customKeywords],
    apiKey: snapshot.apiKey,
  };
}

export function renderSettingsForm(
  container: HTMLElement,
  initialSettings: SettingsFormState,
  handlers: SettingsFormHandlers,
): HTMLFormElement {
  container.replaceChildren();

  let savedSnapshot = cloneSnapshot({
    ...initialSettings,
    apiKey: initialSettings.apiKey ?? "",
  });

  const form = document.createElement("form");
  form.className = "settings-form";

  const title = document.createElement("h1");
  title.className = "settings-form__title";
  title.textContent = "X Cleaner options";
  form.append(title);

  const categorySection = createSection("Built-in categories");
  const categoryCheckboxes = new Map<FilterCategory, HTMLInputElement>();

  for (const category of Object.keys(initialSettings.categories) as FilterCategory[]) {
    const rowId = `category-${category}`;
    const row = renderCheckboxRow(categoryLabels[category], rowId, initialSettings.categories[category]);
    categoryCheckboxes.set(category, row.input);
    categorySection.append(row.wrapper);
  }

  const keywordSection = createSection("Keyword lists");
  const allowlistInput = createTextArea("allowlist", joinLines(initialSettings.allowlist));
  const blacklistInput = createTextArea("blacklist", joinLines(initialSettings.blacklist));
  const customKeywordsInput = createTextArea(
    "custom-keywords",
    joinLines(initialSettings.customKeywords),
  );
  keywordSection.append(
    createField("Allowlist", allowlistInput),
    createField("Blacklist", blacklistInput),
    createField("Custom keywords", customKeywordsInput),
  );

  const aiSection = createSection("AI settings");
  const aiEnabledInput = createCheckbox("ai-enabled", savedSnapshot.ai.enabled);
  const aiEnabledRow = document.createElement("label");
  aiEnabledRow.className = "checkbox-row";
  aiEnabledRow.setAttribute("for", "ai-enabled");
  aiEnabledRow.append(aiEnabledInput, document.createTextNode("AI enabled"));

  const providerSelect = document.createElement("select");
  providerSelect.id = "ai-provider";
  for (const provider of ["openai", "ark", "mock"] as AiProvider[]) {
    const option = document.createElement("option");
    option.value = provider;
    option.textContent =
      provider === "openai"
        ? "OpenAI"
        : provider === "ark"
          ? "Volcengine Ark"
          : "Mock";
    providerSelect.append(option);
  }
  providerSelect.value = savedSnapshot.ai.provider ?? "openai";

  const modelInput = createTextInput("ai-model", savedSnapshot.ai.model ?? "");
  const apiKeyInput = createTextInput("api-key", savedSnapshot.apiKey, "password");

  aiSection.append(
    aiEnabledRow,
    createField("Provider", providerSelect),
    createField("Model", modelInput),
    createField("API key", apiKeyInput),
  );

  const actions = document.createElement("div");
  actions.className = "actions";

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "Save settings";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset";

  actions.append(saveButton, resetButton);

  function applySnapshot(snapshot: SettingsSnapshot): void {
    for (const [category, input] of categoryCheckboxes) {
      input.checked = snapshot.categories[category];
    }

    allowlistInput.value = joinLines(snapshot.allowlist);
    blacklistInput.value = joinLines(snapshot.blacklist);
    customKeywordsInput.value = joinLines(snapshot.customKeywords);
    aiEnabledInput.checked = snapshot.ai.enabled;
    providerSelect.value = snapshot.ai.provider ?? "openai";
    modelInput.value = snapshot.ai.model ?? "";
    apiKeyInput.value = snapshot.apiKey;
  }

  resetButton.addEventListener("click", () => {
    applySnapshot(savedSnapshot);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const settings: Settings = {
      ai: {
        enabled: aiEnabledInput.checked,
        provider: providerSelect.value as AiProvider,
        model: modelInput.value.trim() || undefined,
      },
      confidenceThreshold: initialSettings.confidenceThreshold,
      categories: {
        hate: categoryCheckboxes.get("hate")?.checked ?? initialSettings.categories.hate,
        harassment:
          categoryCheckboxes.get("harassment")?.checked ?? initialSettings.categories.harassment,
        sexual: categoryCheckboxes.get("sexual")?.checked ?? initialSettings.categories.sexual,
        violence:
          categoryCheckboxes.get("violence")?.checked ?? initialSettings.categories.violence,
        spam: categoryCheckboxes.get("spam")?.checked ?? initialSettings.categories.spam,
      },
      allowlist: splitLines(allowlistInput.value),
      blacklist: splitLines(blacklistInput.value),
      customKeywords: splitLines(customKeywordsInput.value),
    };
    const nextSnapshot = cloneSnapshot({
      ...settings,
      apiKey: apiKeyInput.value,
    });

    await handlers.onSave({
      settings,
      apiKey: apiKeyInput.value,
    });

    savedSnapshot = nextSnapshot;
  });

  form.append(categorySection, keywordSection, aiSection, actions);
  container.append(form);

  return form;
}
