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

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You must define an entity.");
    }

    this.config = {
      name: "",
      icon: "mdi:lightbulb",
      background_start: "#ffa20f",
      background_end: "#ff9800",
      track_color: "rgba(255,255,255,0.25)",
      track_inner_color: "rgba(255,255,255,0.45)",
      knob_color: "#d9d9d9",
      chip_background: "rgba(216, 133, 0, 0.8)",
      chip_text_color: "#ffffff",
      state_text_on: "Active",
      state_text_off: "Idle",
      default_color: "#ffd39a",
      slider_height: 84,
      show_power_chip: true,
      show_state_chip: true,
      show_color_controls: true,
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      ...config,
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 3;
  }

  _getStateObj() {
    return this._hass?.states?.[this.config.entity];
  }

  _isLightEntity(entityId) {
    return entityId?.startsWith("light.");
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
    return ["hs", "rgb", "rgbw", "rgbww", "xy", "color_temp"].some((mode) =>
      colorModes.includes(mode)
    );
  }

  _getBrightnessPercent(stateObj) {
    const bri = stateObj?.attributes?.brightness;
    if (typeof bri !== "number") return this._isOn(stateObj) ? 100 : 0;
    return Math.round((bri / 255) * 100);
  }

  _getHexColor(stateObj) {
    const rgb = stateObj?.attributes?.rgb_color;
    if (Array.isArray(rgb) && rgb.length === 3) {
      return (
        "#" +
        rgb
          .map((value) => {
            const hex = Number(value).toString(16);
            return hex.length === 1 ? `0${hex}` : hex;
          })
          .join("")
      );
    }
    return this.config.default_color;
  }

  _getPowerText(stateObj) {
    if (this.config.power_entity && this._hass?.states?.[this.config.power_entity]) {
      const powerState = this._hass.states[this.config.power_entity];
      const unit = powerState.attributes?.unit_of_measurement || "W";
      const value = Number(powerState.state);
      return `${Number.isFinite(value) ? value.toFixed(1) : powerState.state} ${unit}`;
    }

    const value =
      stateObj?.attributes?.power ||
      stateObj?.attributes?.current_power_w ||
      stateObj?.attributes?.power_w;

    if (value == null) return null;
    const numericValue = Number(value);
    return `${Number.isFinite(numericValue) ? numericValue.toFixed(1) : value} W`;
  }

  _dispatchAction(actionConfig, event = null) {
    if (!actionConfig || actionConfig.action === "none") return;
    const stateObj = this._getStateObj();

    switch (actionConfig.action) {
      case "more-info": {
        this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            bubbles: true,
            composed: true,
            detail: { entityId: this.config.entity },
          })
        );
        break;
      }
      case "toggle": {
        if (!stateObj) return;
        const [domain] = this.config.entity.split(".");
        this._hass.callService(domain, "toggle", { entity_id: this.config.entity });
        break;
      }
      case "call-service": {
        if (!actionConfig.service) return;
        const [domain, service] = actionConfig.service.split(".");
        if (!domain || !service) return;
        this._hass.callService(domain, service, actionConfig.service_data || {});
        break;
      }
      case "navigate": {
        if (!actionConfig.navigation_path) return;
        history.pushState(null, "", actionConfig.navigation_path);
        window.dispatchEvent(new Event("location-changed"));
        break;
      }
      case "url": {
        if (!actionConfig.url_path) return;
        window.open(actionConfig.url_path, "_blank", "noopener");
        break;
      }
      case "fire-dom-event": {
        this.dispatchEvent(
          new CustomEvent("ll-custom", {
            bubbles: true,
            composed: true,
            detail: actionConfig,
          })
        );
        break;
      }
      default:
        break;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  _setBrightness(value) {
    const stateObj = this._getStateObj();
    if (!this._hass || this._isUnavailable(stateObj)) return;
    this._hass.callService("light", "turn_on", {
      entity_id: this.config.entity,
      brightness_pct: Number(value),
    });
  }

  _setColor(hexColor) {
    const stateObj = this._getStateObj();
    if (!this._hass || this._isUnavailable(stateObj)) return;
    const cleaned = (hexColor || "").replace("#", "");
    if (cleaned.length !== 6) return;

    const rgb = [
      parseInt(cleaned.substring(0, 2), 16),
      parseInt(cleaned.substring(2, 4), 16),
      parseInt(cleaned.substring(4, 6), 16),
    ];

    this._hass.callService("light", "turn_on", {
      entity_id: this.config.entity,
      rgb_color: rgb,
    });
  }

  _stopEventPropagation(event) {
    event.stopPropagation();
  }

  _getSliderHeight() {
    const parsedHeight = Number(this.config.slider_height);
    if (!Number.isFinite(parsedHeight)) return 84;
    return Math.max(44, parsedHeight);
  }

  render() {
    if (!this.config || !this._hass) return;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

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
    const stateLabel = isUnavailable ? "Unavailable" : isOn ? this.config.state_text_on : this.config.state_text_off;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .card {
          position: relative;
          box-sizing: border-box;
          border-radius: 24px;
          padding: 16px;
          color: #ffffff;
          background: linear-gradient(180deg, ${this.config.background_start}, ${this.config.background_end});
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }

        .card.unavailable {
          opacity: 0.82;
          filter: saturate(0.75);
        }

        .title {
          font-size: 1.7rem;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
          margin-bottom: 12px;
        }

        .slider-shell {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 999px;
          min-height: ${sliderHeight}px;
          padding: 10px 12px;
          border: 3px solid rgba(255,255,255,0.35);
          background: ${this.config.track_color};
          backdrop-filter: blur(2px);
        }

        .icon-chip {
          width: 52px;
          height: 52px;
          min-width: 52px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${this.config.knob_color};
          color: #777;
        }

        .icon-chip ha-icon {
          width: 26px;
          height: 26px;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, ${this.config.track_inner_color} ${brightness}%, rgba(255,255,255,0.16) ${brightness}%);
          outline: none;
          cursor: pointer;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${this.config.knob_color};
          border: none;
          box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${this.config.knob_color};
          border: none;
          box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        }

        .meta-row {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chip {
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          background: ${this.config.chip_background};
          color: ${this.config.chip_text_color};
          border: 2px solid rgba(255,255,255,0.4);
        }

        .state-chip {
          font-size: 0.82rem;
          font-weight: 600;
          opacity: 0.9;
        }

        .state-chip.unavailable {
          background: rgba(214, 48, 49, 0.85);
          color: #fff;
          border-color: rgba(255,255,255,0.55);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .state-chip.unavailable::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
        }

        .color-row {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
        }

        .color-picker {
          width: 100%;
          height: 32px;
          border: 2px solid rgba(255,255,255,0.45);
          border-radius: 999px;
          overflow: hidden;
          cursor: pointer;
          background: transparent;
        }

        .color-apply {
          border: 2px solid rgba(255,255,255,0.45);
          border-radius: 999px;
          color: #fff;
          background: rgba(255,255,255,0.16);
          padding: 6px 12px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }

        input[disabled],
        button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>
      <ha-card>
        <div class="card ${isUnavailable ? "unavailable" : ""}" id="main-card">
          <div class="title">${title}</div>
          <div class="slider-shell">
            <input id="brightness" type="range" min="1" max="100" value="${brightness}" ${isUnavailable ? "disabled" : ""} />
            <div class="icon-chip"><ha-icon icon="${icon}"></ha-icon></div>
          </div>
          <div class="meta-row">
            ${this.config.show_power_chip && powerText ? `<div class="chip">${powerText}</div>` : ""}
            ${this.config.show_state_chip ? `<div class="chip state-chip ${isUnavailable ? "unavailable" : ""}">${stateLabel}</div>` : ""}
          </div>
          ${supportsColor ? `
            <div class="color-row">
              <input id="color-picker" class="color-picker" type="color" value="${hexColor}" ${isUnavailable ? "disabled" : ""} />
              <button id="color-apply" class="color-apply" type="button" ${isUnavailable ? "disabled" : ""}>Apply color</button>
            </div>
          ` : ""}
        </div>
      </ha-card>
    `;

    const card = this.shadowRoot.getElementById("main-card");
    const brightnessSlider = this.shadowRoot.getElementById("brightness");

    card.onclick = () => {
      if (isUnavailable) return;
      this._dispatchAction(this.config.tap_action);
    };
    card.oncontextmenu = (event) => {
      if (isUnavailable) return;
      this._dispatchAction(this.config.hold_action, event);
    };
    card.ondblclick = (event) => {
      if (isUnavailable) return;
      this._dispatchAction(this.config.double_tap_action, event);
    };

    brightnessSlider?.addEventListener("click", (event) => {
      this._stopEventPropagation(event);
    });

    brightnessSlider?.addEventListener("pointerdown", (event) => {
      this._stopEventPropagation(event);
    });

    brightnessSlider?.addEventListener("input", (event) => {
      this._stopEventPropagation(event);
      this._setBrightness(event.target.value);
    });

    brightnessSlider?.addEventListener("change", (event) => {
      this._stopEventPropagation(event);
      this._setBrightness(event.target.value);
    });

    if (supportsColor) {
      const picker = this.shadowRoot.getElementById("color-picker");
      const applyButton = this.shadowRoot.getElementById("color-apply");

      picker?.addEventListener("click", (event) => {
        this._stopEventPropagation(event);
      });
      picker?.addEventListener("pointerdown", (event) => {
        this._stopEventPropagation(event);
      });
      picker?.addEventListener("input", (event) => {
        this._stopEventPropagation(event);
      });
      applyButton?.addEventListener("click", (event) => {
        this._stopEventPropagation(event);
        this._setColor(picker.value || this.config.default_color);
      });
      applyButton?.addEventListener("pointerdown", (event) => {
        this._stopEventPropagation(event);
      });
      picker?.addEventListener("change", (event) => {
        this._stopEventPropagation(event);
        this._setColor(event.target.value || this.config.default_color);
      });
    }
  }
}

class HaSliderDesignCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
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

    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this._config) return;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this.shadowRoot.innerHTML = `
      <style>
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

        .field label {
          font-weight: 600;
        }

        .field input {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--divider-color, #999);
        }

        .field.checkbox {
          flex-direction: row;
          align-items: center;
        }
      </style>
      <div class="grid">
        <div class="field">
          <label>Entity</label>
          <input data-field="entity" value="${this._config.entity || ""}" />
        </div>
        <div class="field">
          <label>Name</label>
          <input data-field="name" value="${this._config.name || ""}" />
        </div>
        <div class="field">
          <label>Icon</label>
          <input data-field="icon" value="${this._config.icon || "mdi:lightbulb"}" />
        </div>
        <div class="field">
          <label>Slider height (px)</label>
          <input
            data-field="slider_height"
            type="number"
            min="44"
            step="1"
            value="${this._config.slider_height ?? 84}"
          />
        </div>
        <div class="field checkbox">
          <label>Show power chip</label>
          <input data-field="show_power_chip" type="checkbox" ${this._config.show_power_chip !== false ? "checked" : ""} />
        </div>
        <div class="field checkbox">
          <label>Show state chip</label>
          <input data-field="show_state_chip" type="checkbox" ${this._config.show_state_chip !== false ? "checked" : ""} />
        </div>
        <div class="field checkbox">
          <label>Show color controls</label>
          <input data-field="show_color_controls" type="checkbox" ${this._config.show_color_controls !== false ? "checked" : ""} />
        </div>
      </div>
    `;

    this.shadowRoot.querySelectorAll("input").forEach((input) => {
      const eventName = input.type === "checkbox" ? "change" : "input";
      input.addEventListener(eventName, (event) => this._valueChanged(event));
    });
  }
}

customElements.define("ha-slider-design", HaSliderDesignCard);
customElements.define("ha-slider-design-card-editor", HaSliderDesignCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-slider-design",
  name: "HA Slider Design",
  preview: true,
  description: "Slider-style Home Assistant card for dimmable lights with color and power chips.",
  documentationURL: "https://github.com/404GamerNotFound/ha-slider-design",
});
