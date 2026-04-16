# Pixel Forge

Pixel Forge is a browser-based pattern studio for pixel art, fuse bead charts,
and crochet planning. It focuses on deliberate low-resolution conversion, direct
grid editing, and scenario-aware guidance instead of generic thumbnail
downscaling.

## Features

- Three creation scenarios: pixel art, fuse beads, crochet charts
- Upload PNG, JPG, or WebP source images
- Convert to `16x16` or `32x32`
- Extract a source-adaptive palette capped to `16` or `32` colors
- Edit the resulting grid directly with paint, erase, and sample tools
- Adjust brush and eraser size from the left tool dock
- Preview line and rectangle results during drag before releasing to commit
- Keep the canvas cursor aligned with the selected drawing tool inside the stage
- Build frame-by-frame animation drafts in pixel art mode
- Inspect palette usage, transparency, and scenario-specific export needs

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
