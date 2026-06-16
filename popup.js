const PRESETS = [
  {
    id: "product-shot",
    title: "Product Shot",
    description: "Clean commercial image with controlled lighting.",
    prompt:
      "Create a polished product image for GPT Image 2 with a clear subject, premium studio lighting, crisp edges, realistic materials, and a simple background",
  },
  {
    id: "brand-visual",
    title: "Brand Visual",
    description: "Campaign-ready image with a strong visual hook.",
    prompt:
      "Create a brand visual for GPT Image 2 with a memorable central concept, cohesive color palette, clean composition, and space for marketing copy",
  },
  {
    id: "portrait",
    title: "Portrait",
    description: "Expressive subject with realistic detail.",
    prompt:
      "Create a high-quality portrait for GPT Image 2 with natural skin texture, expressive eyes, flattering light, realistic depth, and a clean background",
  },
  {
    id: "social-post",
    title: "Social Post",
    description: "Scroll-stopping image for feeds and ads.",
    prompt:
      "Create a social media image for GPT Image 2 with bold subject framing, readable composition, vivid but balanced colors, and a clear focal point",
  },
  {
    id: "logo-concept",
    title: "Logo Concept",
    description: "Simple mark direction with brand-ready polish.",
    prompt:
      "Create a logo concept for GPT Image 2 with a simple recognizable symbol, balanced geometry, clean negative space, and a modern brand presentation",
  },
  {
    id: "image-edit",
    title: "Image Edit",
    description: "Specific edit brief while preserving what matters.",
    prompt:
      "Create an image editing prompt for GPT Image 2 that preserves the main subject identity and scene layout while applying the requested visual change precisely",
  },
];

const DEFAULT_PRESET_ID = PRESETS[0].id;
const STORAGE_KEY = "image2-gpt-image-2-prompt-starter-state";

const presetGrid = document.querySelector("#preset-grid");
const notesInput = document.querySelector("#custom-notes");
const promptOutput = document.querySelector("#prompt-output");
const statusNode = document.querySelector("#status");
const copyButton = document.querySelector("#copy-button");
const openButton = document.querySelector("#open-button");

let selectedPresetId = DEFAULT_PRESET_ID;

function hasChromeStorage() {
  return Boolean(
    typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
  );
}

function hasChromeTabs() {
  return Boolean(typeof chrome !== "undefined" && chrome.tabs);
}

function getPresetById(id) {
  return PRESETS.find((preset) => preset.id === id) || PRESETS[0];
}

function applyQueryState() {
  const params = new URLSearchParams(window.location.search);
  const presetId = params.get("preset");
  const notes = params.get("notes");

  if (presetId) {
    selectedPresetId = getPresetById(presetId).id;
  }

  if (notes) {
    notesInput.value = notes;
  }

  return Boolean(presetId || notes);
}

function normalizeNotes(value) {
  return value.trim().replace(/\s+/g, " ");
}

function buildPrompt() {
  const preset = getPresetById(selectedPresetId);
  const notes = normalizeNotes(notesInput.value);
  return notes ? `${preset.prompt}, ${notes}` : preset.prompt;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function renderPresets() {
  presetGrid.replaceChildren();

  PRESETS.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-card";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(preset.id === selectedPresetId));
    button.dataset.presetId = preset.id;

    const marker = document.createElement("span");
    marker.className = "preset-marker";
    marker.setAttribute("aria-hidden", "true");

    const title = document.createElement("span");
    title.className = "preset-title";
    title.textContent = preset.title;

    const description = document.createElement("span");
    description.className = "preset-description";
    description.textContent = preset.description;

    button.append(marker, title, description);
    button.addEventListener("click", () => {
      selectedPresetId = preset.id;
      updatePrompt();
    });

    presetGrid.append(button);
  });
}

function updatePrompt(options = {}) {
  renderPresets();
  promptOutput.value = buildPrompt();
  if (!options.skipPersist) {
    persistState();
  }
}

async function persistState() {
  if (!hasChromeStorage()) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        presetId: selectedPresetId,
        customNotes: notesInput.value,
      })
    );
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      presetId: selectedPresetId,
      customNotes: notesInput.value,
    },
  });
}

async function restoreState() {
  if (applyQueryState()) {
    updatePrompt({ skipPersist: true });
    return;
  }

  if (!hasChromeStorage()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        if (typeof state?.presetId === "string") {
          selectedPresetId = state.presetId;
        }
        if (typeof state?.customNotes === "string") {
          notesInput.value = state.customNotes;
        }
      }
    } catch (error) {
      console.error("Failed to restore popup state", error);
    }

    updatePrompt({ skipPersist: true });
    return;
  }

  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const state = stored[STORAGE_KEY];
    if (state && typeof state === "object") {
      if (typeof state.presetId === "string" && getPresetById(state.presetId)) {
        selectedPresetId = state.presetId;
      }
      if (typeof state.customNotes === "string") {
        notesInput.value = state.customNotes;
      }
    }
  } catch (error) {
    console.error("Failed to restore popup state", error);
  }

  updatePrompt({ skipPersist: true });
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(promptOutput.value);
    setStatus("Prompt copied.");
  } catch (error) {
    console.error("Clipboard copy failed", error);
    promptOutput.focus();
    promptOutput.select();
    setStatus("Copy failed. Select the text and copy it manually.");
  }
}

function openImage2() {
  const prompt = encodeURIComponent(promptOutput.value);
  const url = `https://image2.to/gpt-image-2?utm_source=chrome_extension&utm_medium=popup&utm_campaign=gpt_image_2_prompt_starter&prompt=${prompt}`;
  if (hasChromeTabs()) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, "_blank", "noopener");
  }
  setStatus("Opened image2.to.");
}

notesInput.addEventListener("input", () => {
  updatePrompt();
  setStatus("");
});

copyButton.addEventListener("click", () => {
  void copyPrompt();
});

openButton.addEventListener("click", () => {
  openImage2();
});

void restoreState();
