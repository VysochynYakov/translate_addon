try {
  importScripts("config.js");
} catch (_error) {
  globalThis.MISTRAL_API_KEY = "";
}

const DEFAULT_SETTINGS = {
  activeModelProfileId: "default-mistral",
  languages: ["English", "Italian", "French", "Ukrainian", "Albanian"],
  modelProfiles: [
    {
      id: "default-mistral",
      name: "Mistral Small",
      model: "mistral-small-latest",
      apiKey: ""
    }
  ],
  targetLanguage: "English"
};

const SYSTEM_PROMPT = [
  "You translate Russian text into the requested target language.",
  "Preserve meaning, tone, emojis, punctuation, and line breaks.",
  "Make the result natural, clear, and suitable for chats or web forms.",
  "Return only the translated text. Do not explain anything."
].join(" ");

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const modelProfiles = normalizeModelProfiles(settings);
  await chrome.storage.sync.set({
    activeModelProfileId: settings.activeModelProfileId || modelProfiles[0].id,
    languages: normalizeLanguages(settings.languages),
    modelProfiles,
    targetLanguage: settings.targetLanguage || DEFAULT_SETTINGS.targetLanguage,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "TRANSLATE_TEXT") {
    return false;
  }

  translateText(message.text)
    .then((translatedText) => sendResponse({ ok: true, translatedText }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "translate-active-field") {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "TRANSLATE_ACTIVE_FIELD" });
  }
});

async function translateText(text) {
  const sourceText = String(text || "").trim();
  if (!sourceText) {
    throw new Error("There is no text to translate.");
  }

  const settings = await chrome.storage.sync.get({
    ...DEFAULT_SETTINGS,
    apiKey: ""
  });
  const modelProfile = getActiveModelProfile(settings);

  const apiKey = modelProfile.apiKey || settings.apiKey || globalThis.MISTRAL_API_KEY || "";
  if (!apiKey) {
    throw new Error("Mistral API key is missing. Open the extension settings first.");
  }

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelProfile.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Target language: ${settings.targetLanguage}\n\nText:\n${sourceText}`
        }
      ]
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiMessage = data?.error?.message || response.statusText;
    throw new Error(`Translation failed: ${apiMessage}`);
  }

  const translatedText = data?.choices?.[0]?.message?.content?.trim();
  if (!translatedText) {
    throw new Error("Translation failed: empty response from API.");
  }

  return translatedText;
}

function getActiveModelProfile(settings) {
  const modelProfiles = normalizeModelProfiles(settings);
  return modelProfiles.find((profile) => profile.id === settings.activeModelProfileId)
    || modelProfiles[0];
}

function normalizeModelProfiles(settings) {
  const profiles = Array.isArray(settings.modelProfiles)
    ? settings.modelProfiles
    : [];

  const normalized = profiles
    .map((profile) => ({
      id: String(profile.id || crypto.randomUUID()),
      name: String(profile.name || profile.model || "Mistral model").trim(),
      model: String(profile.model || "").trim(),
      apiKey: String(profile.apiKey || "").trim()
    }))
    .filter((profile) => profile.model);

  if (normalized.length) {
    return normalized;
  }

  return [
    {
      ...DEFAULT_SETTINGS.modelProfiles[0],
      model: settings.model || DEFAULT_SETTINGS.modelProfiles[0].model,
      apiKey: settings.apiKey || ""
    }
  ];
}

function normalizeLanguages(languages) {
  const normalized = Array.isArray(languages)
    ? languages.map((language) => String(language).trim()).filter(Boolean)
    : [];

  return normalized.length ? normalized : DEFAULT_SETTINGS.languages;
}
