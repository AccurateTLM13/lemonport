# MDR Nothing Factory Asset Pack

This pack uses a hybrid production approach:

- **Baked high-fidelity machine render** for metal, glass, bevels, screws, conveyor detail, receipt slot, and button bay.
- **HTML/CSS/JS overlays** only for behavior: lemon movement, scanner pulse, receipt slip reveal, button hit area, and checkout state.

## Files

```text
machine/
  nothing-factory-machine.png
  nothing-factory-machine.webp
  nothing-factory-machine-1448.webp
  nothing-factory-machine-1200.webp
  nothing-factory-machine-1024.webp
  nothing-factory-machine-768.webp
  nothing-factory-machine-640.webp
  nothing-factory-machine-480.webp

overlays/
  lemon.svg
  scanner-beam.svg
  receipt-slip.svg
  button-glow.svg
  barcode.svg
  stamp.svg
  receipt-edge.svg
  receipt-texture.svg
  conveyor-belt.svg

integration/
  nothing-machine.html
  nothing-machine.css
  nothing-machine.js
  overlay-map.json
```

## Integration Rule

Bake visual complexity. Code behavior.

Do not recreate the full machine with divs. Use the machine render as the base asset, then layer the interactive parts with percentage-based positioning.

## Suggested destination

```text
million-dollar-receipt/assets/machine/
million-dollar-receipt/assets/overlays/
```

Then merge the CSS/JS snippets into `assets/css/mdr.css` and `assets/js/mdr.js`.

## Accessibility

The visible machine image should use `alt=""` because it is decorative. Keep the real button in the DOM with screen-reader text:

```html
<button class="nothing-machine__hitbox" type="button">
  <span class="sr-only">Buy Nothing for $1</span>
</button>
```

## States

```text
idle → intake → conveyor → scan → print → checkout
```

The component dispatches:

```js
nothing-machine:checkout-ready
```

when the animation is complete.
