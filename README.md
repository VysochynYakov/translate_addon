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

## Usage

- Default target language: English.
- Available languages: English, Italian, French, Ukrainian, Albanian.
- You can add or remove languages in the extension popup.
- You can add multiple Mistral model profiles, each with its own API key.
- Drag the floating translate button to move it. The position is saved automatically.
- Use `Reset floating button position` in the popup to return the button to automatic placement near the active field.
- Optional hotkey: `Ctrl+Shift+Y` on Windows/Linux or `Command+Shift+Y` on macOS.
- To change the hotkey, click `Change keyboard shortcut` in the extension popup.

## Notes

- This is intended for personal local use.
- The API key can be stored in Chrome extension sync storage or in local `config.js`.
- If you publish or share the extension, move API calls behind a private backend.
