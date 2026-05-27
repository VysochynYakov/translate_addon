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

const apiKeyInput = document.getElementById("apiKey");
const addLanguageButton = document.getElementById("addLanguage");
const addModelProfileButton = document.getElementById("addModelProfile");
const deleteModelProfileButton = document.getElementById("deleteModelProfile");
const languageList = document.getElementById("languageList");
const modelInput = document.getElementById("model");
const modelProfileNameInput = document.getElementById("modelProfileName");
const modelProfileSelect = document.getElementById("modelProfileSelect");
const newLanguageInput = document.getElementById("newLanguage");
const openShortcutsButton = document.getElementById("openShortcuts");
const resetButtonPositionButton = document.getElementById("resetButtonPosition");
const saveButton = document.getElementById("save");
const statusText = document.getElementById("status");
const targetLanguageSelect = document.getElementById("targetLanguage");

let modelProfiles = [...DEFAULT_SETTINGS.modelProfiles];
let languages = [...DEFAULT_SETTINGS.languages];
let activeModelProfileId = DEFAULT_SETTINGS.activeModelProfileId;
let targetLanguage = DEFAULT_SETTINGS.targetLanguage;

loadSettings();
addLanguageButton.addEventListener("click", addLanguage);
addModelProfileButton.addEventListener("click", addModelProfile);
deleteModelProfileButton.addEventListener("click", deleteModelProfile);
modelProfileSelect.addEventListener("change", selectModelProfile);
newLanguageInput.addEventListener("keydown", addLanguageOnEnter);
openShortcutsButton.addEventListener("click", openShortcutSettings);
resetButtonPositionButton.addEventListener("click", resetButtonPosition);
saveButton.addEventListener("click", saveSettings);
targetLanguageSelect.addEventListener("change", () => {
  targetLanguage = targetLanguageSelect.value;
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    ...DEFAULT_SETTINGS,
    apiKey: "",
    model: ""
  });

  modelProfiles = normalizeModelProfiles(settings);
  languages = normalizeLanguages(settings.languages);
  activeModelProfileId = settings.activeModelProfileId || modelProfiles[0].id;
  targetLanguage = languages.includes(settings.targetLanguage)
    ? settings.targetLanguage
    : languages[0];

  render();
}

async function saveSettings() {
  applyCurrentModelFields();
  const usableProfiles = modelProfiles.filter((profile) => profile.model);

  if (!usableProfiles.length) {
    showStatus("Add at least one model name before saving.", true);
    return;
  }

  await chrome.storage.sync.set({
    activeModelProfileId,
    languages,
    modelProfiles: usableProfiles,
    targetLanguage
  });

  modelProfiles = usableProfiles;
  renderModelProfiles();
  showStatus("Saved.");
}

function addModelProfile() {
  applyCurrentModelFields();

  const profile = {
    id: crypto.randomUUID(),
    name: "New Mistral model",
    model: "",
    apiKey: ""
  };

  modelProfiles.push(profile);
  activeModelProfileId = profile.id;
  render();
  modelInput.focus();
  showStatus("Fill in the model and API key, then save.");
}

function deleteModelProfile() {
  if (modelProfiles.length <= 1) {
    showStatus("Keep at least one model profile.", true);
    return;
  }

  modelProfiles = modelProfiles.filter((profile) => profile.id !== activeModelProfileId);
  activeModelProfileId = modelProfiles[0].id;
  render();
}

function selectModelProfile() {
  applyCurrentModelFields();
  activeModelProfileId = modelProfileSelect.value;
  renderModelFields();
}

function applyCurrentModelFields() {
  const profile = getActiveModelProfile();
  if (!profile) {
    return;
  }

  profile.name = modelProfileNameInput.value.trim() || modelInput.value.trim() || "Mistral model";
  profile.model = modelInput.value.trim();
  profile.apiKey = apiKeyInput.value.trim();
}

function addLanguage() {
  const language = newLanguageInput.value.trim();
  if (!language) {
    return;
  }

  if (!languages.some((existing) => existing.toLowerCase() === language.toLowerCase())) {
    languages.push(language);
  }

  targetLanguage = language;
  newLanguageInput.value = "";
  renderLanguages();
}

function addLanguageOnEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    addLanguage();
  }
}

function deleteLanguage(language) {
  if (languages.length <= 1) {
    showStatus("Keep at least one language.", true);
    return;
  }

  languages = languages.filter((item) => item !== language);
  if (targetLanguage === language) {
    targetLanguage = languages[0];
  }
  renderLanguages();
}

function render() {
  renderModelProfiles();
  renderLanguages();
}

function renderModelProfiles() {
  modelProfileSelect.replaceChildren();

  for (const profile of modelProfiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name || profile.model || "Mistral model";
    modelProfileSelect.appendChild(option);
  }

  if (!modelProfiles.some((profile) => profile.id === activeModelProfileId)) {
    activeModelProfileId = modelProfiles[0].id;
  }

  modelProfileSelect.value = activeModelProfileId;
  renderModelFields();
}

function renderModelFields() {
  const profile = getActiveModelProfile();
  modelProfileNameInput.value = profile?.name || "";
  modelInput.value = profile?.model || "";
  apiKeyInput.value = profile?.apiKey || "";
  deleteModelProfileButton.disabled = modelProfiles.length <= 1;
}

function renderLanguages() {
  targetLanguageSelect.replaceChildren();
  languageList.replaceChildren();

  for (const language of languages) {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = language;
    targetLanguageSelect.appendChild(option);

    const item = document.createElement("li");
    item.textContent = language;

    const deleteButton = document.createElement("button");
    deleteButton.className = "pt-small-danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Remove";
    deleteButton.addEventListener("click", () => deleteLanguage(language));

    item.appendChild(deleteButton);
    languageList.appendChild(item);
  }

  if (!languages.includes(targetLanguage)) {
    targetLanguage = languages[0];
  }
  targetLanguageSelect.value = targetLanguage;
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
    .filter((profile) => profile.model || profile.name);

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

function normalizeLanguages(items) {
  const normalized = Array.isArray(items)
    ? items.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return normalized.length ? normalized : [...DEFAULT_SETTINGS.languages];
}

function getActiveModelProfile() {
  return modelProfiles.find((profile) => profile.id === activeModelProfileId);
}

async function openShortcutSettings() {
  await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

async function resetButtonPosition() {
  await chrome.storage.sync.remove("buttonPosition");
  showStatus("Floating button position reset.");
}

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.dataset.error = String(isError);
  window.setTimeout(() => {
    statusText.textContent = "";
    statusText.dataset.error = "false";
  }, isError ? 3000 : 1800);
}
