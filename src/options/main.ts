import { getApiKey, getSettings, saveApiKey, saveSettings } from "../shared/storage";
import { renderSettingsForm } from "./settings-form";
import "./settings.css";

async function bootstrapOptionsPage(): Promise<void> {
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const [settings, apiKey] = await Promise.all([getSettings(), getApiKey()]);

  renderSettingsForm(app, { ...settings, apiKey: apiKey ?? "" }, {
    onSave: async ({ settings: nextSettings, apiKey: nextApiKey }) => {
      await saveSettings(nextSettings);
      await saveApiKey(nextApiKey);
    },
  });
}

void bootstrapOptionsPage();

export {};
