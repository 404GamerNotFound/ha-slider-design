class HaSliderDesignCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("ha-slider-design-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:ha-slider-design",
      entity: "light.living_room",
      name: "Living Room",
    };
  }

  constructor() {
    super();
    this._hass = null;
    this.config = null;
    this._rootReady = false;
    this._debounceTimer = null;
    this._lastBrightnessValue = null;
    this._refs = {};
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You must define an entity.");
    }

    this.config = {
      name: "",
      icon: "mdi:lightbulb",
      background_start: "#ffa20f",
      background_end: "#ff9800",
      track_color: "rgba(255,255,255,0.20)",
      track_inner_color: "rgba(255,255,255,0.42)",
      knob_color: "#d9d9d9",
      chip_background: "rgba(216, 133, 0, 0.78)",
      chip_text_color: "#ffffff",
      state_text_on: "Active",
      state_text_off: "Idle",
      default_color: "#ffd39a",
      slider_height: 60,
      show_power_chip: true,
      show_state_chip: true,
      show_color_controls: true,
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      double_tap_action: { action: "none" },
      ...config,
    };

    this._ensureRoot();
    this._updateCard();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    this._ensureRoot();
    this._updateCard();
  }

  getCardSize() {
    return 2;
  }

  _ensureRoot() {
    if (this._rootReady) return;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          overflow: hidden;
          border-radius: 20px;
        }

        .card {
          position: relative;
          box-sizing: border-box;
          border-radius: 20px;
          padding: 12px;
          color: #ffffff;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
          background: linear-gradient(180deg, var(--bg-start), var(--bg-end));
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
          transition:
            opacity 0.2s ease,
            filter 0.2s ease,
            transform 0.12s ease;
        }

        .card:active {
          transform: scale(0.995);
        }

        .card.unavailable {
          opacity: 0.82;
          filter: saturate(0.72);
        }

        .title {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
          margin-bottom: 8px;
          word-break: break-word;
        }

        .slider-shell {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          min-height: var(--slider-height);
          padding: 8px 10px;
          border: 2px solid rgba(255,255,255,0.28);
          background: var(--track-color);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }

        .icon-chip {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--knob-color);
          color: rgba(0, 0, 0, 0.48);
        }

        .icon-chip ha-icon {
          width: 22px;
          height: 22px;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 10px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
          background: linear-gradient(
            90deg,
            var(--track-inner-color) var(--slider-fill, 0%),
            rgba(255,255,255,0.14) var(--slider-fill, 0%)
          );
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--knob-color);
          border: none;
          box-shadow: 0 2px 7px rgba(0,0,0,0.28);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--knob-color);
          border: none;
          box-shadow: 0 2px 7px rgba(0,0,0,0.28);
        }

        .meta-row {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .chip {
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.76rem;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 0.01em;
          background: var(--chip-bg);
          color: var(--chip-text);
          border: 1px solid rgba(255,255,255,0.32);
          white-space: nowrap;
        }

        .state-chip {
          opacity: 0.95;
        }

        .state-chip.unavailable {
          background: rgba(214, 48, 49, 0.88);
          color: #fff;
          border-color: rgba(255,255,255,0.5);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .state-chip.unavailable::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.16);
        }

        .color-row {
          margin-top: 8px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .color-picker {
          width: 100%;
          height: 28px;
          border: 1px solid rgba(255,255,255,0.40);
          border-radius: 999px;
          overflow: hidden;
          cursor: pointer;
          background: transparent;
          padding: 0;
        }

        .color-apply {
          border: 1px solid rgba(255,255,255,0.40);
          border-radius: 999px;
          color: #fff;
          background: rgba(255,255,255,0.12);
          padding: 5px 10px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
        }

        .hidden {
          display: none !important;
        }

        input[disabled],
        button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>

      <ha-card>
        <div class="card" id="main-card">
          <div class="title" id="title"></div>

          <div class="slider-shell">
            <input id="brightness" type="range" min="1" max="100" />
            <div class="icon-chip">
              <ha-icon id="icon"></ha-icon>
            </div>
          </div>

          <div class="meta-row" id="meta-row">
            <div class="chip hidden" id="power-chip"></div>
            <div class="chip state-chip hidden" id="state-chip"></div>
          </div>

          <div class="color-row hidden" id="color-row">
            <input id="color-picker" class="color-picker" type="color" />
            <button id="color-apply" class="color-apply" type="button">Apply color</button>
          </div>
        </div>
      </ha-card>
    `;

    this._refs = {
      card: this.shadowRoot.getElementById("main-card"),
      title: this.shadowRoot.getElementById("title"),
      icon: this.shadowRoot.getElementById("icon"),
      brightness: this.shadowRoot.getElementById("brightness"),
      metaRow: this.shadowRoot.getElementById("meta-row"),
      powerChip: this.shadowRoot.getElementById("power-chip"),
      stateChip: this.shadowRoot.getElementById("state-chip"),
      colorRow: this.shadowRoot.getElementById("color-row"),
      colorPicker: this.shadowRoot.getElementById("color-picker"),
      colorApply: this.shadowRoot.getElementById("color-apply"),
    };

    this._attachEventListeners();
    this._rootReady = true;
  }

  _attachEventListeners() {
    const { card, brightness, colorPicker, colorApply } = this._refs;

    card.addEventListener("click", (event) => {
      if (this._isInteractiveTarget(event.target)) return;
      const stateObj = this._getStateObj();
      if (this._isUnavailable(stateObj)) return;
      this._dispatchAction(this.config?.tap_action, event);
    });

    card.addEventListener("contextmenu", (event) => {
      const stateObj = this._getStateObj();
      if (this._isUnavailable(stateObj)) return;
      this._dispatchAction(this.config?.hold_action, event);
    });

    card.addEventListener("dblclick", (event) => {
      if (this._isInteractiveTarget(event.target)) return;
      const stateObj = this._getStateObj();
      if (this._isUnavailable(stateObj)) return;
      this._dispatchAction(this.config?.double_tap_action, event);
    });

    ["click", "pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
      brightness.addEventListener(eventName, (event) => this._stopEventPropagation(event));
      colorPicker.addEventListener(eventName, (event) => this._stopEventPropagation(event));
      colorApply.addEventListener(eventName, (event) => this._stopEventPropagation(event));
    });

    brightness.addEventListener("input", (event) => {
      this._stopEventPropagation(event);
      const value = Number(event.target.value);
      this._setSliderFill(value);
      this._debouncedSetBrightness(value);
    });

    brightness.addEventListener("change", (event) => {
      this._stopEventPropagation(event);
      const value = Number(event.target.value);
      this._flushBrightnessDebounce(value);
    });

    colorPicker.addEventListener("change", (event) => {
      this._stopEventPropagation(event);
      this._setColor(event.target.value || this.config.default_color);
    });

    colorApply.addEventListener("click", (event) => {
      this._stopEventPropagation(event);
      this._setColor(colorPicker.value || this.config.default_color);
    });
  }

  _getStateObj() {
    return this._hass?.states?.[this.config?.entity];
  }

  _isLightEntity(entityId) {
    return typeof entityId === "string" && entityId.startsWith("light.");
  }

  _isOn(stateObj) {
    return stateObj?.state === "on";
  }

  _isUnavailable(stateObj) {
    if (!stateObj) return true;
    return ["unavailable", "unknown", "none"].includes(String(stateObj.state || "").toLowerCase());
  }

  _supportsColor(stateObj) {
    if (!stateObj || !this._isLightEntity(this.config.entity)) return false;

    const colorModes = stateObj.attributes?.supported_color_modes || [];
    const colorCapableModes = ["hs", "rgb", "rgbw", "rgbww", "xy"];

    return colorCapableModes.some((mode) => colorModes.includes(mode));
  }

  _getBrightnessPercent(stateObj) {
    const bri = stateObj?.attributes?.brightness;
    if (typeof bri !== "number") return this._isOn(stateObj) ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((bri / 255) * 100)));
  }

  _getHexColor(stateObj) {
    const rgb = stateObj?.attributes?.rgb_color;
    if (Array.isArray(rgb) && rgb.length === 3) {
      return (
        "#" +
        rgb
          .map((value) => {
            const safe = Math.max(0, Math.min(255, Number(value) || 0));
            return safe.toString(16).padStart(2, "0");
          })
          .join("")
      );
    }
    return this.config.default_color;
  }

  _formatNumber(value, digits = 1) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return String(value);
    return numericValue % 1 === 0 ? String(numericValue) : numericValue.toFixed(digits);
  }

  _getPowerText(stateObj) {
    if (this.config.power_entity && this._hass?.states?.[this.config.power_entity]) {
      const powerState = this._hass.states[this.config.power_entity];
      const unit = powerState.attributes?.unit_of_measurement || "W";
      return `${this._formatNumber(powerState.state, 1)} ${unit}`;
    }

    const value =
      stateObj?.attributes?.power ??
      stateObj?.attributes?.current_power_w ??
      stateObj?.attributes?.power_w;

    if (value == null) return null;
    return `${this._formatNumber(value, 1)} W`;
  }

  _dispatchAction(actionConfig, event = null) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!actionConfig || actionConfig.action === "none") return;

    const stateObj = this._getStateObj();

    switch (actionConfig.action) {
      case "more-info":
        this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            bubbles: true,
            composed: true,
            detail: { entityId: this.config.entity },
          })
        );
        break;

      case "toggle": {
        if (!stateObj || !this._hass) return;
        const [domain] = this.config.entity.split(".");
        if (!domain) return;
        this._hass.callService(domain, "toggle", { entity_id: this.config.entity });
        break;
      }

      case "call-service": {
        if (!this._hass || !actionConfig.service) return;
        const [domain, service] = String(actionConfig.service).split(".");
        if (!domain || !service) return;
        this._hass.callService(domain, service, actionConfig.service_data || {});
        break;
      }

      case "navigate":
        if (!actionConfig.navigation_path) return;
        history.pushState(null, "", actionConfig.navigation_path);
        window.dispatchEvent(new Event("location-changed"));
        break;

      case "url":
        if (!actionConfig.url_path) return;
        window.open(actionConfig.url_path, "_blank", "noopener");
        break;

      case "fire-dom-event":
        this.dispatchEvent(
          new CustomEvent("ll-custom", {
            bubbles: true,
            composed: true,
            detail: actionConfig,
          })
        );
        break;

      default:
        break;
    }
  }

  _setBrightness(value) {
    const stateObj = this._getStateObj();
    if (!this._hass || this._isUnavailable(stateObj) || !this._isLightEntity(this.config.entity)) return;

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;

    this._lastBrightnessValue = numericValue;

    this._hass.callService("light", "turn_on", {
      entity_id: this.config.entity,
      brightness_pct: numericValue,
    });
  }

  _debouncedSetBrightness(value) {
    window.clearTimeout(this._debounceTimer);
    this._debounceTimer = window.setTimeout(() => {
      this._setBrightness(value);
      this._debounceTimer = null;
    }, 120);
  }

  _flushBrightnessDebounce(value) {
    window.clearTimeout(this._debounceTimer);
    this._debounceTimer = null;

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;

    if (this._lastBrightnessValue === numericValue) return;
    this._setBrightness(numericValue);
  }

  _setColor(hexColor) {
    const stateObj = this._getStateObj();
    if (!this._hass || this._isUnavailable(stateObj) || !this._isLightEntity(this.config.entity)) return;

    const cleaned = String(hexColor || "").replace("#", "");
    if (cleaned.length !== 6) return;

    const rgb = [
      parseInt(cleaned.substring(0, 2), 16),
      parseInt(cleaned.substring(2, 4), 16),
      parseInt(cleaned.substring(4, 6), 16),
    ];

    if (rgb.some((value) => !Number.isFinite(value))) return;

    this._hass.callService("light", "turn_on", {
      entity_id: this.config.entity,
      rgb_color: rgb,
    });
  }

  _stopEventPropagation(event) {
    event.stopPropagation();
  }

  _isInteractiveTarget(target) {
    return !!target?.closest?.('input, button, select, textarea, a');
  }

  _getSliderHeight() {
    const parsedHeight = Number(this.config.slider_height);
    if (!Number.isFinite(parsedHeight)) return 60;
    return Math.max(40, parsedHeight);
  }

  _setSliderFill(value) {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    this._refs.card?.style.setProperty("--slider-fill", `${safeValue}%`);
  }

  _updateCard() {
    if (!this._rootReady || !this.config || !this._hass) return;

    const stateObj = this._getStateObj();
    const isUnavailable = this._isUnavailable(stateObj);
    const isOn = this._isOn(stateObj);
    const brightness = this._getBrightnessPercent(stateObj);
    const powerText = this._getPowerText(stateObj);
    const hexColor = this._getHexColor(stateObj);
    const supportsColor = this._supportsColor(stateObj) && this.config.show_color_controls;
    const sliderHeight = this._getSliderHeight();

    const title = this.config.name || stateObj?.attributes?.friendly_name || this.config.entity;
    const icon = this.config.icon || stateObj?.attributes?.icon || "mdi:lightbulb";
    const stateLabel = isUnavailable
      ? "Unavailable"
      : isOn
        ? this.config.state_text_on
        : this.config.state_text_off;

    this._refs.card.style.setProperty("--bg-start", this.config.background_start);
    this._refs.card.style.setProperty("--bg-end", this.config.background_end);
    this._refs.card.style.setProperty("--track-color", this.config.track_color);
    this._refs.card.style.setProperty("--track-inner-color", this.config.track_inner_color);
    this._refs.card.style.setProperty("--knob-color", this.config.knob_color);
    this._refs.card.style.setProperty("--chip-bg", this.config.chip_background);
    this._refs.card.style.setProperty("--chip-text", this.config.chip_text_color);
    this._refs.card.style.setProperty("--slider-height", `${sliderHeight}px`);

    this._refs.card.classList.toggle("unavailable", isUnavailable);
    this._refs.title.textContent = title;
    this._refs.icon.setAttribute("icon", icon);

    if (String(this._refs.brightness.value) !== String(brightness)) {
      this._refs.brightness.value = String(brightness);
    }
    this._setSliderFill(brightness);
    this._refs.brightness.disabled = isUnavailable;

    this._refs.powerChip.classList.toggle(
      "hidden",
      !(this.config.show_power_chip && powerText)
    );
    this._refs.powerChip.textContent = powerText || "";

    this._refs.stateChip.classList.toggle("hidden", !this.config.show_state_chip);
    this._refs.stateChip.classList.toggle("unavailable", isUnavailable);
    this._refs.stateChip.textContent = stateLabel;

    this._refs.metaRow.classList.toggle(
      "hidden",
      this._refs.powerChip.classList.contains("hidden") &&
      this._refs.stateChip.classList.contains("hidden")
    );

    this._refs.colorRow.classList.toggle("hidden", !supportsColor);
    this._refs.colorPicker.disabled = isUnavailable;
    this._refs.colorApply.disabled = isUnavailable;

    if (supportsColor && this._refs.colorPicker.value !== hexColor) {
      this._refs.colorPicker.value = hexColor;
    }
  }
}

class HaSliderDesignCardEditor extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = {};
    this._rootReady = false;
    this._refs = {};
    this._fieldDefinitions = [
      { key: "entity", label: "Entity", type: "text", section: "general" },
      { key: "name", label: "Name", type: "text", section: "general" },
      { key: "icon", label: "Icon", type: "text", section: "general", placeholder: "mdi:lightbulb" },
      { key: "power_entity", label: "Power entity", type: "text", section: "general", placeholder: "sensor.some_power" },
      { key: "slider_height", label: "Slider height (px)", type: "number", section: "general", min: 40, step: 1 },

      { key: "state_text_on", label: "State text on", type: "text", section: "labels" },
      { key: "state_text_off", label: "State text off", type: "text", section: "labels" },

      { key: "show_power_chip", label: "Show power chip", type: "checkbox", section: "visibility" },
      { key: "show_state_chip", label: "Show state chip", type: "checkbox", section: "visibility" },
      { key: "show_color_controls", label: "Show color controls", type: "checkbox", section: "visibility" },

      { key: "background_start", label: "Background start", type: "color", section: "colors" },
      { key: "background_end", label: "Background end", type: "color", section: "colors" },
      { key: "track_color", label: "Track color", type: "text", section: "colors" },
      { key: "track_inner_color", label: "Track fill color", type: "text", section: "colors" },
      { key: "knob_color", label: "Knob color", type: "color", section: "colors" },
      { key: "chip_background", label: "Chip background", type: "text", section: "colors" },
      { key: "chip_text_color", label: "Chip text color", type: "color", section: "colors" },
      { key: "default_color", label: "Default light color", type: "color", section: "colors" },
    ];
  }

  setConfig(config) {
    this._config = {
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      double_tap_action: { action: "none" },
      ...config,
    };

    this._ensureRoot();
    this._updateFormValues();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rootReady) {
      this._ensureRoot();
      this._updateFormValues();
    }
  }

  _ensureRoot() {
    if (this._rootReady) return;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 8px 0 0;
        }

        .wrapper {
          display: grid;
          gap: 16px;
        }

        .section {
          border: 1px solid var(--divider-color, rgba(120,120,120,0.35));
          border-radius: 14px;
          padding: 14px;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field.checkbox {
          flex-direction: row;
          align-items: center;
          gap: 10px;
          min-height: 40px;
        }

        .field label {
          font-size: 0.92rem;
          font-weight: 600;
        }

        .field input,
        .field select,
        .field textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--divider-color, #999);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
          font: inherit;
        }

        .field input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin: 0;
          padding: 0;
        }

        .field input[type="color"] {
          min-height: 42px;
          padding: 4px;
          cursor: pointer;
        }

        .field textarea {
          resize: vertical;
          min-height: 86px;
        }

        .subgrid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .action-block {
          display: grid;
          gap: 12px;
          padding: 12px;
          border: 1px dashed var(--divider-color, rgba(120,120,120,0.35));
          border-radius: 12px;
        }

        .hint {
          font-size: 0.8rem;
          opacity: 0.75;
          line-height: 1.35;
        }

        .hidden {
          display: none !important;
        }
      </style>

      <div class="wrapper">
        <div class="section" id="section-general">
          <div class="section-title">General</div>
          <div class="grid" id="general-grid"></div>
        </div>

        <div class="section" id="section-visibility">
          <div class="section-title">Visibility</div>
          <div class="grid" id="visibility-grid"></div>
        </div>

        <div class="section" id="section-labels">
          <div class="section-title">Labels</div>
          <div class="grid" id="labels-grid"></div>
        </div>

        <div class="section" id="section-colors">
          <div class="section-title">Colors</div>
          <div class="grid" id="colors-grid"></div>
        </div>

        <div class="section" id="section-actions">
          <div class="section-title">Actions</div>
          <div class="grid" id="actions-grid"></div>
        </div>
      </div>
    `;

    this._buildFields();
    this._buildActionEditors();
    this._rootReady = true;
  }

  _buildFields() {
    const containers = {
      general: this.shadowRoot.getElementById("general-grid"),
      visibility: this.shadowRoot.getElementById("visibility-grid"),
      labels: this.shadowRoot.getElementById("labels-grid"),
      colors: this.shadowRoot.getElementById("colors-grid"),
    };

    this._fieldDefinitions.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = `field${field.type === "checkbox" ? " checkbox" : ""}`;

      const label = document.createElement("label");
      label.textContent = field.label;

      const input = document.createElement("input");
      input.dataset.field = field.key;
      input.type = field.type;

      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.min != null) input.min = String(field.min);
      if (field.step != null) input.step = String(field.step);

      const changeEvent = field.type === "checkbox" ? "change" : "change";
      input.addEventListener(changeEvent, (event) => this._valueChanged(event));

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      containers[field.section].appendChild(wrapper);

      this._refs[field.key] = input;
    });
  }

  _buildActionEditors() {
    const actionsGrid = this.shadowRoot.getElementById("actions-grid");
    const actionTypes = [
      { value: "none", label: "None" },
      { value: "toggle", label: "Toggle" },
      { value: "more-info", label: "More info" },
      { value: "navigate", label: "Navigate" },
      { value: "url", label: "Open URL" },
      { value: "call-service", label: "Call service" },
      { value: "fire-dom-event", label: "Fire DOM event" },
    ];

    ["tap_action", "hold_action", "double_tap_action"].forEach((actionKey) => {
      const block = document.createElement("div");
      block.className = "action-block";
      block.dataset.actionKey = actionKey;

      const title = document.createElement("div");
      title.className = "section-title";
      title.style.marginBottom = "0";
      title.style.fontSize = "0.95rem";
      title.textContent = actionKey.replaceAll("_", " ");

      const subgrid = document.createElement("div");
      subgrid.className = "subgrid";

      const typeField = this._createActionField("Action", "select");
      const typeSelect = typeField.querySelector("select");
      typeSelect.dataset.actionKey = actionKey;
      typeSelect.dataset.actionPart = "action";
      actionTypes.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        typeSelect.appendChild(option);
      });
      typeSelect.addEventListener("change", (event) => this._actionValueChanged(event));

      const serviceField = this._createActionField("Service", "input");
      const serviceInput = serviceField.querySelector("input");
      serviceInput.placeholder = "light.toggle";
      serviceInput.dataset.actionKey = actionKey;
      serviceInput.dataset.actionPart = "service";
      serviceInput.addEventListener("change", (event) => this._actionValueChanged(event));

      const navField = this._createActionField("Navigation path", "input");
      const navInput = navField.querySelector("input");
      navInput.placeholder = "/lovelace/test";
      navInput.dataset.actionKey = actionKey;
      navInput.dataset.actionPart = "navigation_path";
      navInput.addEventListener("change", (event) => this._actionValueChanged(event));

      const urlField = this._createActionField("URL", "input");
      const urlInput = urlField.querySelector("input");
      urlInput.placeholder = "https://example.com";
      urlInput.dataset.actionKey = actionKey;
      urlInput.dataset.actionPart = "url_path";
      urlInput.addEventListener("change", (event) => this._actionValueChanged(event));

      const jsonField = this._createActionField("Service data / event data (JSON)", "textarea");
      const jsonInput = jsonField.querySelector("textarea");
      jsonInput.placeholder = '{"entity_id":"light.kitchen"}';
      jsonInput.dataset.actionKey = actionKey;
      jsonInput.dataset.actionPart = "json";
      jsonInput.addEventListener("change", (event) => this._actionValueChanged(event));

      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "For call-service and fire-dom-event, JSON must be valid.";

      subgrid.appendChild(typeField);
      subgrid.appendChild(serviceField);
      subgrid.appendChild(navField);
      subgrid.appendChild(urlField);
      block.appendChild(title);
      block.appendChild(subgrid);
      block.appendChild(jsonField);
      block.appendChild(hint);
      actionsGrid.appendChild(block);

      this._refs[`${actionKey}.action`] = typeSelect;
      this._refs[`${actionKey}.service`] = serviceInput;
      this._refs[`${actionKey}.navigation_path`] = navInput;
      this._refs[`${actionKey}.url_path`] = urlInput;
      this._refs[`${actionKey}.json`] = jsonInput;
    });
  }

  _createActionField(labelText, elementType) {
    const field = document.createElement("div");
    field.className = "field";

    const label = document.createElement("label");
    label.textContent = labelText;

    let control;
    if (elementType === "select") {
      control = document.createElement("select");
    } else if (elementType === "textarea") {
      control = document.createElement("textarea");
    } else {
      control = document.createElement("input");
      control.type = "text";
    }

    field.appendChild(label);
    field.appendChild(control);
    return field;
  }

  _valueChanged(event) {
    if (!this._config || !event?.target) return;

    const target = event.target;
    const field = target.dataset.field;
    if (!field) return;

    const nextConfig = { ...this._config };

    if (target.type === "checkbox") {
      nextConfig[field] = target.checked;
    } else if (target.type === "number") {
      const parsedNumber = Number(target.value);
      nextConfig[field] = Number.isFinite(parsedNumber) ? parsedNumber : target.value;
    } else {
      nextConfig[field] = target.value;
    }

    this._emitConfig(nextConfig);
  }

  _actionValueChanged(event) {
    if (!this._config || !event?.target) return;

    const target = event.target;
    const actionKey = target.dataset.actionKey;
    if (!actionKey) return;

    const currentAction = { ...(this._config[actionKey] || {}) };
    const nextConfig = { ...this._config };

    const actionType = this._refs[`${actionKey}.action`]?.value || "none";
    currentAction.action = actionType;

    const serviceValue = this._refs[`${actionKey}.service`]?.value?.trim();
    const navigationValue = this._refs[`${actionKey}.navigation_path`]?.value?.trim();
    const urlValue = this._refs[`${actionKey}.url_path`]?.value?.trim();
    const jsonValue = this._refs[`${actionKey}.json`]?.value?.trim();

    delete currentAction.service;
    delete currentAction.navigation_path;
    delete currentAction.url_path;
    delete currentAction.service_data;

    if (actionType === "call-service" && serviceValue) {
      currentAction.service = serviceValue;
      currentAction.service_data = this._safeParseJson(jsonValue);
    }

    if (actionType === "navigate" && navigationValue) {
      currentAction.navigation_path = navigationValue;
    }

    if (actionType === "url" && urlValue) {
      currentAction.url_path = urlValue;
    }

    if (actionType === "fire-dom-event") {
      const eventData = this._safeParseJson(jsonValue);
      Object.assign(currentAction, eventData || {});
    }

    nextConfig[actionKey] = currentAction;
    this._emitConfig(nextConfig);
  }

  _safeParseJson(value) {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  _emitConfig(nextConfig) {
    this._config = nextConfig;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true,
      })
    );

    this._updateFormValues();
  }

  _updateFormValues() {
    if (!this._rootReady || !this._config) return;

    this._fieldDefinitions.forEach((field) => {
      const input = this._refs[field.key];
      if (!input) return;

      const value = this._config[field.key];

      if (field.type === "checkbox") {
        input.checked = value !== false;
      } else if (field.type === "number") {
        input.value = value != null ? String(value) : "";
      } else {
        input.value = value != null ? String(value) : "";
      }
    });

    ["tap_action", "hold_action", "double_tap_action"].forEach((actionKey) => {
      const actionConfig = this._config[actionKey] || {};
      const actionType = actionConfig.action || "none";

      const actionSelect = this._refs[`${actionKey}.action`];
      const serviceInput = this._refs[`${actionKey}.service`];
      const navInput = this._refs[`${actionKey}.navigation_path`];
      const urlInput = this._refs[`${actionKey}.url_path`];
      const jsonInput = this._refs[`${actionKey}.json`];

      if (actionSelect && document.activeElement !== actionSelect) {
        actionSelect.value = actionType;
      }

      if (serviceInput && document.activeElement !== serviceInput) {
        serviceInput.value = actionConfig.service || "";
      }

      if (navInput && document.activeElement !== navInput) {
        navInput.value = actionConfig.navigation_path || "";
      }

      if (urlInput && document.activeElement !== urlInput) {
        urlInput.value = actionConfig.url_path || "";
      }

      if (jsonInput && document.activeElement !== jsonInput) {
        let jsonValue = "";
        if (actionType === "call-service") {
          jsonValue = JSON.stringify(actionConfig.service_data || {}, null, 2);
        } else if (actionType === "fire-dom-event") {
          const cloned = { ...actionConfig };
          delete cloned.action;
          jsonValue = JSON.stringify(cloned, null, 2);
        }
        jsonInput.value = jsonValue;
      }
    });
  }
}

if (!customElements.get("ha-slider-design")) {
  customElements.define("ha-slider-design", HaSliderDesignCard);
}

if (!customElements.get("ha-slider-design-card-editor")) {
  customElements.define("ha-slider-design-card-editor", HaSliderDesignCardEditor);
}

window.customCards = window.customCards || [];

if (!window.customCards.some((card) => card.type === "ha-slider-design")) {
  window.customCards.push({
    type: "ha-slider-design",
    name: "HA Slider Design",
    preview: true,
    description: "Compact slider-style Home Assistant card for dimmable lights with color and power chips.",
    documentationURL: "https://github.com/404GamerNotFound/ha-slider-design",
  });
}
