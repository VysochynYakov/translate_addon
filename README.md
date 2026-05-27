# Personal Translator

A small personal Chrome extension for translating Russian text directly inside web forms and chat fields.

## What It Does

1. Write Russian text in a field on a website.
2. Click the floating language button near the field.
3. The extension sends the text to Mistral.
4. The Russian text is replaced with the translated text in the same field.

## Setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this project folder.
5. Click the extension icon.
6. Add or edit a model profile with a Mistral model name and API key.
7. Add or remove target languages as needed.
8. Choose the active model and target language, then save.

## Install On Another Computer

1. Clone the repository:

   ```bash
   git clone https://github.com/VysochynYakov/translate_addon.git
   cd translate_addon
   ```

2. Open Chrome and go to:

   ```text
   chrome://extensions
   ```

3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the cloned `translate_addon` folder.
6. Add your Mistral API key.

Recommended way:

1. Click the extension icon.
2. Add or edit a model profile.
3. Paste the API key into the `API key` field.
4. Click `Save settings`.

Alternative local way:

1. Create a local `config.js` file in the project root, next to `manifest.json`.
2. Add this content:

   ```js
   globalThis.MISTRAL_API_KEY = "your_mistral_api_key_here";
   ```

3. Do not commit this file. It is already ignored by `.gitignore`.
4. Reload the extension in `chrome://extensions`.

## Usage

- Default target language: English.
- Available languages: English, Italian, French, Ukrainian, Albanian.
- You can add or remove languages in the extension popup.
- You can add multiple Mistral model profiles, each with its own API key.
- Drag the floating translate button to move it. The position is saved automatically.
- Use `Reset floating button position` in the popup to return the button to automatic placement near the active field.
- Optional hotkey: `Ctrl+Shift+Y` on Windows/Linux or `Command+Shift+Y` on macOS.
- To change the hotkey, click `Change keyboard shortcut` in the extension popup.

## Keyboard Shortcut

To configure the shortcut manually, open:

```text
chrome://extensions/shortcuts
```

Find `Personal Translator`, then set a shortcut for:

```text
Translate the active field
```

You can also open this page from the extension popup by clicking `Change keyboard shortcut`.

## Notes

- This is intended for personal local use.
- The API key can be stored in Chrome extension sync storage or in local `config.js`.
- If you publish or share the extension, move API calls behind a private backend.
