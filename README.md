# Pixel Forge

Pixel Forge is a browser-based pixel-art converter focused on deliberate
low-resolution output instead of generic thumbnail downscaling.

## Features

- Upload PNG, JPG, or WebP source images
- Convert to `16x16` or `32x32`
- Extract a source-adaptive palette capped to `16` or `32` colors
- Toggle conservative ordered dithering and cleanup
- Preserve silhouette edges during conservative cleanup
- Inspect output as an editable cell grid with palette and grid stats

## Workflow

1. Upload an image with a clear silhouette.
2. Start with `32x32` if the subject has more detail.
3. Use `16 colors` for bolder simplification and `32 colors` for softer ramps.
4. Enable dithering only when gradients need help.
5. Use cleanup to remove noise, then refine edges and clusters manually.

## Development

```bash
npm install
npm run dev
```

Run verification with:

```bash
npm test -- --run
npm run build
```
