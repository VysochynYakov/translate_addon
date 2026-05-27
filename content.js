(function () {
  const BUTTON_ID = "personal-translator-button";
  const STATUS_ID = "personal-translator-status";
  const TEXT_INPUT_TYPES = new Set([
    "email",
    "number",
    "search",
    "tel",
    "text",
    "url"
  ]);
  const LANGUAGE_CODES = {
    English: "EN",
    Italian: "IT",
    French: "FR",
    Ukrainian: "UK",
    Albanian: "SQ"
  };

  let activeField = null;
  let button = null;
  let buttonPosition = null;
  let dragState = null;
  let statusBox = null;
  let isTranslating = false;
  let wasDragged = false;
  let targetLanguage = "English";

  loadSettings();
  document.addEventListener("focusin", handleFocusIn, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("click", handleClick, true);
  window.addEventListener("scroll", positionButton, true);
  window.addEventListener("resize", positionButton);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "TRANSLATE_ACTIVE_FIELD") {
      translateActiveField();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.targetLanguage) {
      targetLanguage = changes.targetLanguage.newValue || "English";
      updateButtonLabel();
    }

    if (areaName === "sync" && changes.buttonPosition) {
      buttonPosition = changes.buttonPosition.newValue || null;
      positionButton();
    }
  });

  async function loadSettings() {
    const settings = await chrome.storage.sync.get({
      buttonPosition: null,
      targetLanguage: "English"
    });
    buttonPosition = normalizeButtonPosition(settings.buttonPosition);
    targetLanguage = settings.targetLanguage;
    updateButtonLabel();
  }

  function handleFocusIn(event) {
    const field = getEditableField(event.target);
    if (!field) {
      hideButton();
      return;
    }

    activeField = field;
    showButton();
  }

  function handleInput(event) {
    const field = getEditableField(event.target);
    if (field && field === activeField) {
      positionButton();
    }
  }

  function handleClick(event) {
    const field = getEditableField(event.target);
    if (field) {
      activeField = field;
      showButton();
    }
  }

  function getEditableField(element) {
    if (!element || !(element instanceof Element)) {
      return null;
    }

    if (element instanceof HTMLTextAreaElement) {
      return element.disabled || element.readOnly ? null : element;
    }

    if (element instanceof HTMLInputElement) {
      const type = (element.type || "text").toLowerCase();
      return TEXT_INPUT_TYPES.has(type) && !element.disabled && !element.readOnly
        ? element
        : null;
    }

    const editable = element.isContentEditable
      ? element
      : element.closest('[contenteditable="true"], [contenteditable="plaintext-only"]');

    return editable instanceof HTMLElement ? editable : null;
  }

  function showButton() {
    if (!button) {
      button = document.createElement("button");
      button.id = BUTTON_ID;
      button.type = "button";
      button.title = "Drag to move. Click to translate and replace text.";
      button.addEventListener("mousedown", startDrag);
      button.addEventListener("click", handleButtonClick);
      document.documentElement.appendChild(button);
    }

    updateButtonLabel();
    button.hidden = false;
    positionButton();
  }

  function hideButton() {
    if (button) {
      button.hidden = true;
    }
  }

  function updateButtonLabel() {
    if (!button) {
      return;
    }

    button.textContent = isTranslating
      ? "..."
      : LANGUAGE_CODES[targetLanguage] || targetLanguage.slice(0, 2).toUpperCase();
  }

  function positionButton() {
    if (!button || button.hidden) {
      return;
    }

    if (buttonPosition) {
      applyButtonPosition(buttonPosition);
      return;
    }

    if (!activeField || !document.contains(activeField)) {
      return;
    }

    const rect = activeField.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      hideButton();
      return;
    }

    button.style.left = `${Math.min(window.innerWidth - 48, rect.right + 8)}px`;
    button.style.top = `${Math.max(8, rect.top)}px`;
  }

  function handleButtonClick(event) {
    if (wasDragged) {
      event.preventDefault();
      event.stopPropagation();
      wasDragged = false;
      return;
    }

    translateActiveField();
  }

  function startDrag(event) {
    if (event.button !== 0 || !button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = button.getBoundingClientRect();
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY
    };
    wasDragged = false;

    document.addEventListener("mousemove", dragButton, true);
    document.addEventListener("mouseup", stopDrag, true);
  }

  function dragButton(event) {
    if (!dragState || !button) {
      return;
    }

    const moved = Math.abs(event.clientX - dragState.startX) > 3
      || Math.abs(event.clientY - dragState.startY) > 3;
    if (!moved && !wasDragged) {
      return;
    }

    wasDragged = true;
    buttonPosition = clampButtonPosition({
      left: event.clientX - dragState.offsetX,
      top: event.clientY - dragState.offsetY
    });
    applyButtonPosition(buttonPosition);
  }

  async function stopDrag() {
    document.removeEventListener("mousemove", dragButton, true);
    document.removeEventListener("mouseup", stopDrag, true);
    dragState = null;

    if (wasDragged && buttonPosition) {
      await chrome.storage.sync.set({ buttonPosition });
    }
  }

  function applyButtonPosition(position) {
    const nextPosition = clampButtonPosition(position);
    button.style.left = `${nextPosition.left}px`;
    button.style.top = `${nextPosition.top}px`;
  }

  function clampButtonPosition(position) {
    const width = button?.offsetWidth || 38;
    const height = button?.offsetHeight || 30;
    return {
      left: Math.round(Math.min(Math.max(8, position.left), window.innerWidth - width - 8)),
      top: Math.round(Math.min(Math.max(8, position.top), window.innerHeight - height - 8))
    };
  }

  function normalizeButtonPosition(position) {
    if (!position || typeof position.left !== "number" || typeof position.top !== "number") {
      return null;
    }

    return position;
  }

  async function translateActiveField() {
    if (isTranslating) {
      return;
    }

    activeField = getEditableField(document.activeElement) || activeField;
    if (!activeField) {
      showStatus("Click inside a text field first.", true);
      return;
    }

    const originalText = getFieldText(activeField);
    if (!originalText.trim()) {
      showStatus("There is no text to translate.", true);
      return;
    }

    isTranslating = true;
    updateButtonLabel();

    try {
      const response = await sendTranslateMessage(originalText);
      setFieldText(activeField, response.translatedText);
      showStatus("Translated.");
    } catch (error) {
      showStatus(error.message || "Translation failed.", true);
    } finally {
      isTranslating = false;
      updateButtonLabel();
      positionButton();
    }
  }

  function sendTranslateMessage(text) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "TRANSLATE_TEXT", text }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.error || "Translation failed."));
          return;
        }

        resolve(response);
      });
    });
  }

  function getFieldText(field) {
    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      return field.value;
    }

    return field.innerText || field.textContent || "";
  }

  function setFieldText(field, text) {
    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      setNativeValue(field, text);
      dispatchTextEvents(field);
      return;
    }

    field.focus();
    const replacedViaCommand = replaceContentEditableSelection(field, text);
    if (!replacedViaCommand) {
      field.textContent = text;
    }
    dispatchTextEvents(field);
  }

  function setNativeValue(field, value) {
    const prototype = Object.getPrototypeOf(field);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor?.set) {
      descriptor.set.call(field, value);
    } else {
      field.value = value;
    }
  }

  function replaceContentEditableSelection(field, text) {
    const selection = window.getSelection();
    if (!selection) {
      return false;
    }

    const range = document.createRange();
    range.selectNodeContents(field);
    selection.removeAllRanges();
    selection.addRange(range);

    return document.execCommand?.("insertText", false, text) === true;
  }

  function dispatchTextEvents(field) {
    field.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText"
    }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function showStatus(message, isError = false) {
    if (!statusBox) {
      statusBox = document.createElement("div");
      statusBox.id = STATUS_ID;
      document.documentElement.appendChild(statusBox);
    }

    statusBox.textContent = message;
    statusBox.dataset.error = String(isError);
    statusBox.hidden = false;
    window.clearTimeout(showStatus.timeoutId);
    showStatus.timeoutId = window.setTimeout(() => {
      statusBox.hidden = true;
    }, isError ? 5000 : 1800);
  }

  if (globalThis.__PERSONAL_TRANSLATOR_TEST_MODE__) {
    globalThis.__personalTranslator = {
      getEditableField,
      getFieldText,
      setFieldText
    };
  }
})();
