# HA Slider Design

A **Home Assistant Lovelace custom card** in the same visual style as `ha-button-design` and `ha-heat-design`, focused on **slider-based controls** for dimmable lights.

- Soft orange gradient card background
- Rounded inner slider area with icon chip
- Optional power/energy chip (`W`)
- Light brightness control
- Light color support with default fallback color
- Full tap/hold/double-tap action handling

## Donation

If you like this project and want to support development:

- PayPal: https://www.paypal.com/paypalme/TonyBrueser

## Related projects

- Button design: https://github.com/404GamerNotFound/ha-button-design
- Heat design: https://github.com/404GamerNotFound/ha-heat-design

## HACS installation

1. Open **HACS** → **Frontend**.
2. Click the three dots → **Custom repositories**.
3. Add this repository URL:
   - `https://github.com/404GamerNotFound/ha-slider-design`
4. Category: **Dashboard**.
5. Install **HA Slider Design**.
6. Reload your browser.

## Manual installation

1. Copy `ha-slider-design.js` into your Home Assistant `www` folder.
2. Add the resource in Home Assistant:

```yaml
url: /local/ha-slider-design.js
type: module
```

## Lovelace example

```yaml
type: custom:ha-slider-design
name: Living Room
entity: light.living_room
icon: mdi:lightbulb
background_start: "#ffa20f"
background_end: "#ff9800"
state_text_on: "Active"
state_text_off: "Idle"
track_color: "rgba(255,255,255,0.25)"
track_inner_color: "rgba(255,255,255,0.45)"
knob_color: "#d9d9d9"
chip_background: "rgba(216, 133, 0, 0.8)"
chip_text_color: "#ffffff"
default_color: "#ffd39a"
show_power_chip: true
show_color_controls: true
power_entity: sensor.living_room_lamp_power
tap_action:
  action: toggle
hold_action:
  action: more-info
double_tap_action:
  action: call-service
  service: light.turn_off
  service_data:
    entity_id: light.living_room
```

## Supported configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | string | required | Use `custom:ha-slider-design` |
| `entity` | string | required | Usually a `light.*` entity |
| `name` | string | entity name | Card title |
| `icon` | string | `mdi:lightbulb` | Icon in the slider chip |
| `background_start` | string | `#ffa20f` | Gradient start color |
| `background_end` | string | `#ff9800` | Gradient end color |
| `track_color` | string | `rgba(255,255,255,0.25)` | Outer slider background |
| `track_inner_color` | string | `rgba(255,255,255,0.45)` | Filled range color |
| `knob_color` | string | `#d9d9d9` | Slider thumb and icon chip color |
| `chip_background` | string | `rgba(216, 133, 0, 0.8)` | Power/status chip background |
| `chip_text_color` | string | `#ffffff` | Power/status chip text color |
| `state_text_on` | string | `Active` | Label when entity is on |
| `state_text_off` | string | `Idle` | Label when entity is off |
| `default_color` | string | `#ffd39a` | Fallback color for color-enabled lights |
| `show_power_chip` | boolean | `true` | Show power chip when value exists |
| `show_color_controls` | boolean | `true` | Show color picker for color-capable lights |
| `power_entity` | string | optional | External sensor for power value |
| `tap_action` | object | toggle | Home Assistant action |
| `hold_action` | object | more-info | Home Assistant action |
| `double_tap_action` | object | none | Home Assistant action |

## Notes

- Brightness slider sends `light.turn_on` with `brightness_pct`.
- Color picker sends `light.turn_on` with `rgb_color`.
- If `power_entity` is set, that sensor value is preferred for the power chip.
