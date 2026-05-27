const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(root, fileName), "utf8"));
}

function assertFileExists(fileName) {
  assert.ok(fs.existsSync(path.join(root, fileName)), `${fileName} should exist`);
}

function testManifest() {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.equal(manifest.background.service_worker, "background.js");
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.ok(manifest.permissions.includes("storage"));
  assert.ok(manifest.host_permissions.includes("https://api.mistral.ai/*"));
  assert.ok(manifest.content_scripts[0].matches.includes("<all_urls>"));
  assert.ok(manifest.content_scripts[0].js.includes("content.js"));
  assert.ok(manifest.content_scripts[0].css.includes("styles.css"));
  assert.ok(manifest.commands["translate-active-field"]);
  assert.equal(
    manifest.commands["translate-active-field"].suggested_key.mac,
    "Command+Shift+Y"
  );
}

function testPopupShortcutButton() {
  const popupHtml = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const popupJs = fs.readFileSync(path.join(root, "popup.js"), "utf8");

  assert.match(popupHtml, /id="openShortcuts"/);
  assert.match(popupHtml, /Change keyboard shortcut/);
  assert.match(popupJs, /chrome:\/\/extensions\/shortcuts/);
}

function testEditableSettingsUi() {
  const popupHtml = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const popupJs = fs.readFileSync(path.join(root, "popup.js"), "utf8");

  assert.match(popupHtml, /id="addModelProfile"/);
  assert.match(popupHtml, /id="deleteModelProfile"/);
  assert.match(popupHtml, /id="modelProfileSelect"/);
  assert.match(popupHtml, /id="addLanguage"/);
  assert.match(popupHtml, /id="languageList"/);
  assert.match(popupJs, /modelProfiles/);
  assert.match(popupJs, /languages/);
  assert.match(popupJs, /chrome\.storage\.sync\.set/);
}

function testFloatingButtonControls() {
  const contentJs = fs.readFileSync(path.join(root, "content.js"), "utf8");
  const popupHtml = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const popupJs = fs.readFileSync(path.join(root, "popup.js"), "utf8");

  assert.match(contentJs, /buttonPosition/);
  assert.match(contentJs, /startDrag/);
  assert.match(contentJs, /dragButton/);
  assert.match(contentJs, /chrome\.storage\.sync\.set\(\{ buttonPosition \}\)/);
  assert.match(popupHtml, /id="resetButtonPosition"/);
  assert.match(popupJs, /chrome\.storage\.sync\.remove\("buttonPosition"\)/);
}

function createDomSandbox() {
  class Event {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = Boolean(options.bubbles);
    }
  }

  class InputEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.inputType = options.inputType;
    }
  }

  class Element {
    constructor() {
      this.disabled = false;
      this.readOnly = false;
      this.isContentEditable = false;
      this.listeners = [];
      this.textContent = "";
    }

    closest() {
      return null;
    }

    dispatchEvent(event) {
      this.listeners.push(event.type);
      return true;
    }

    focus() {
      this.focused = true;
    }
  }

  class HTMLElement extends Element {}

  class HTMLTextAreaElement extends HTMLElement {
    constructor() {
      super();
      this.value = "";
    }
  }

  class HTMLInputElement extends HTMLElement {
    constructor() {
      super();
      this.type = "text";
      this.value = "";
    }
  }

  const document = {
    activeElement: null,
    addEventListener() {},
    createRange() {
      return {
        selectNodeContents() {}
      };
    },
    get documentElement() {
      return new HTMLElement();
    },
    contains() {
      return true;
    },
    execCommand() {
      return false;
    }
  };

  const chrome = {
    runtime: {
      onMessage: { addListener() {} }
    },
    storage: {
      onChanged: { addListener() {} },
      sync: {
        async get(defaults) {
          return defaults;
        }
      }
    }
  };

  return {
    console,
    globalThis: null,
    window: {
      addEventListener() {},
      getSelection() {
        return {
          removeAllRanges() {},
          addRange() {}
        };
      }
    },
    document,
    chrome,
    Event,
    InputEvent,
    Element,
    HTMLElement,
    HTMLTextAreaElement,
    HTMLInputElement,
    __PERSONAL_TRANSLATOR_TEST_MODE__: true
  };
}

function testContentHelpers() {
  const sandbox = createDomSandbox();
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(root, "content.js"), "utf8"),
    sandbox,
    { filename: "content.js" }
  );

  const input = new sandbox.HTMLInputElement();
  input.value = "привет";
  assert.equal(sandbox.__personalTranslator.getFieldText(input), "привет");
  sandbox.__personalTranslator.setFieldText(input, "hello");
  assert.equal(input.value, "hello");
  assert.deepEqual(input.listeners, ["input", "change"]);

  const editable = new sandbox.HTMLElement();
  editable.isContentEditable = true;
  editable.textContent = "как дела?";
  assert.equal(sandbox.__personalTranslator.getEditableField(editable), editable);
  sandbox.__personalTranslator.setFieldText(editable, "how are you?");
  assert.equal(editable.textContent, "how are you?");
  assert.deepEqual(editable.listeners, ["input", "change"]);
}

function run() {
  [
    "AGENTS.md",
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "styles.css"
  ].forEach(assertFileExists);

  testManifest();
  testPopupShortcutButton();
  testEditableSettingsUi();
  testFloatingButtonControls();
  testContentHelpers();
  console.log("Smoke tests passed.");
}

run();
