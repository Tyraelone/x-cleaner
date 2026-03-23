# X Cleaner

X Cleaner is a Chrome extension for `x.com` that collapses low-quality or unwanted content before it takes over your timeline. It ships with local filtering rules out of the box and can optionally use your own AI provider for tougher edge cases.

## What It Does

X Cleaner can inspect and collapse:

- posts and replies
- display names and handles
- profile bio surfaces that can be read reliably

It supports:

- built-in filtering categories for hate, harassment, sexual content, violence, and spam
- custom keywords and phrases
- account allowlists and blacklists
- reversible collapsed placeholders so content is never permanently hidden
- optional AI classification with a user-supplied API key

## Install And Use

### Option 1: Load The Unpacked Extension

1. Clone this repository.
2. Install dependencies with `npm install`.
3. Build the extension with `npm run build`.
4. Open `chrome://extensions` in Chrome.
5. Enable Developer Mode.
6. Click `Load unpacked`.
7. Select [dist](/Users/duanziyu/Documents/x-cleaner/dist).

### Option 2: Use The Packaged Build

If you already have the packaged artifact, use [x-cleaner-extension.zip](/Users/duanziyu/Documents/x-cleaner/x-cleaner-extension.zip) from the release workflow as the distributable build source, then extract it and load the unpacked folder in Chrome.

## Configure The Extension

Open the extension options page after loading it into Chrome. The current options UI supports:

- enabling or disabling built-in categories
- editing allowlist accounts
- editing blacklist accounts
- adding custom keywords
- enabling AI classification
- choosing the AI provider
- entering a model name
- saving an API key

Collapsed items stay expandable from the page UI, so filtering is reversible and low-surprise by default.

## AI Support

AI is optional and disabled by default.

Current behavior:

- local rules run first
- AI is only used when enabled in settings
- OpenAI is supported as a provider
- Volcengine Ark is supported through its OpenAI-compatible API
- a mock provider is available for local testing
- if the API key is missing or AI fails, the extension falls back safely instead of breaking page behavior

## Development

### Requirements

- Node.js 18 or newer
- npm

### Setup

```bash
npm install
```

### Scripts

- `npm run dev` builds in watch mode
- `npm run build` creates the production extension in `dist/`
- `npm test -- --run` runs the full test suite

## Verification

The current release was verified with:

```bash
npm test -- --run
npm run build
```

## Project Structure

- [public/manifest.json](/Users/duanziyu/Documents/x-cleaner/public/manifest.json) defines the MV3 extension manifest
- [src/content/index.ts](/Users/duanziyu/Documents/x-cleaner/src/content/index.ts) boots DOM scanning and collapse behavior on `x.com`
- [src/background/index.ts](/Users/duanziyu/Documents/x-cleaner/src/background/index.ts) handles background AI classification requests
- [src/options/settings-form.ts](/Users/duanziyu/Documents/x-cleaner/src/options/settings-form.ts) renders and saves extension settings
- [src/shared](/Users/duanziyu/Documents/x-cleaner/src/shared) contains shared types, defaults, storage, rules, and classifier logic

## Status

`v0.1.8` folds every blocked match by default, gives expanded content a manual "Fold again" control, and refreshes the collapsed card UI so filtered items are easier to understand at a glance.
