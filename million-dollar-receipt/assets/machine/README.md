# Nothing Factory machine renders

High-fidelity machine base images for the Million Dollar Receipt hero.

## Install from asset pack

Place the full asset pack at:

```text
images/mdr/mdr-nothing-factory-assets/
```

Then run from repo root:

```bash
node scripts/install-mdr-assets.js
```

This copies `machine/` and `overlays/` into `million-dollar-receipt/assets/` and generates responsive WebP variants when ImageMagick is available.

## Expected files

```text
nothing-factory-machine.webp
nothing-factory-machine.png
nothing-factory-machine-1448.webp
nothing-factory-machine-1200.webp
nothing-factory-machine-1024.webp
nothing-factory-machine-768.webp
nothing-factory-machine-640.webp
nothing-factory-machine-480.webp
```

Overlay positions are defined in `../overlay-map.json`.
