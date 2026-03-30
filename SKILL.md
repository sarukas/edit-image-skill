---
name: edit-image
description: >
  Image manipulation and processing skill using Node.js Sharp framework. Use this skill whenever
  the user wants to resize, crop, rotate, flip, convert formats (jpg/png/webp/avif/tiff), adjust
  quality, apply grayscale, blur, sharpen, extract metadata, or do any other image transformation.
  Trigger on: "resize this image", "convert to webp", "make it grayscale", "rotate 90 degrees",
  "compress this image", "crop to 800x600", "extract image info", "blur the image", "sharpen",
  "flip", "flop", "overlay", "composite", "get image metadata", "batch process images",
  or any request involving image editing, transformation, or processing.
  Always use this skill when the user provides image files (jpg, png, webp, gif, avif, tiff, svg)
  and asks for any kind of manipulation — even if they just say "process this" or "fix this image".
---

# Edit Image Skill

A Node.js image processing skill powered by the [Sharp](https://sharp.pixelplumbing.com/) library.
Sharp is a high-performance image processing library that supports resize, crop, rotate, format
conversion, filters, metadata extraction, and more.

## Paths

| Purpose | Path |
|---------|------|
| Script | `~/.claude/skills/edit-image-skill/scripts/image-sharp.js` |
| Scratchpad | `~/.claude/skills/edit-image-skill/scratch/` |

All intermediate and temporary files go in the scratchpad. The final result is moved to the
current working directory when work is complete.

## Setup (first time only)

```bash
cd ~/.claude/skills/edit-image-skill/scripts && npm install
```

## CLI Reference

```bash
node ~/.claude/skills/edit-image-skill/scripts/image-sharp.js [options]
```

### Core Options

| Option | Description |
|--------|-------------|
| `--input, -i` | Input image path (required) |
| `--output, -o` | Output image path (required, except for `--info` / `--preview`) |
| `--info` | Print metadata only — no output file, no image loaded into context |
| `--preview PATH` | Generate a 400px-wide JPEG thumbnail for visual orientation — context-safe |

### Transform Options (can be combined)

| Option | Example | Description |
|--------|---------|-------------|
| `--resize WxH` | `--resize 800x600` | Resize. Use `800x` to resize by width only (preserve aspect ratio) |
| `--resize-fit` | `--resize-fit cover` | Fit mode: cover, contain, fill, inside, outside (default: cover) |
| `--crop X,Y,W,H` | `--crop 100,50,400,300` | Extract/crop region: left,top,width,height |
| `--rotate N` | `--rotate 90` | Rotate degrees clockwise. Use `auto` for EXIF auto-rotation |
| `--flip` | `--flip` | Flip vertically (mirror top-to-bottom) |
| `--flop` | `--flop` | Flop horizontally (mirror left-to-right) |
| `--format FMT` | `--format webp` | Convert to: jpeg, jpg, png, webp, avif, tiff, gif |
| `--quality N` | `--quality 85` | Output quality 1-100 (jpeg/webp/avif) |
| `--grayscale` | `--grayscale` | Convert to grayscale |
| `--blur N` | `--blur 5` | Gaussian blur sigma (0.3-1000) |
| `--sharpen` | `--sharpen` | Apply default sharpening |
| `--sharpen-sigma N` | `--sharpen-sigma 2` | Sharpen with custom sigma |
| `--negate` | `--negate` | Invert image colours |
| `--normalize` | `--normalize` | Enhance contrast (histogram stretching) |
| `--gamma N` | `--gamma 2.2` | Apply gamma correction |
| `--tint COLOR` | `--tint "#FF6600"` | Apply colour tint (hex or css colour) |
| `--composite IMG` | `--composite watermark.png` | Overlay image on top |
| `--composite-gravity G` | `--composite-gravity southeast` | Position: center, north, south, east, west, northeast, northwest, southeast, southwest |
| `--composite-blend B` | `--composite-blend over` | Blend mode: over, multiply, screen, overlay |
| `--trim` | `--trim` | Trim similar border pixels |

### Quick Examples

```bash
SCRIPT="$HOME/.claude/skills/edit-image-skill/scripts/image-sharp.js"
SCRATCH="$HOME/.claude/skills/edit-image-skill/scratch"

# Metadata
node $SCRIPT --input photo.jpg --info

# Preview (context-safe thumbnail)
node $SCRIPT --input photo.jpg --preview $SCRATCH/preview.jpg

# Resize to 800px wide
node $SCRIPT -i photo.jpg -o $SCRATCH/out.jpg --resize 800x

# Square crop + grayscale + convert to WebP
node $SCRIPT -i photo.jpg -o $SCRATCH/out.webp --crop 0,0,600,600 --grayscale --format webp --quality 85

# Rotate + flip
node $SCRIPT -i photo.jpg -o $SCRATCH/out.jpg --rotate 90 --flip

# Watermark in bottom-right
node $SCRIPT -i photo.jpg -o $SCRATCH/out.jpg --composite logo.png --composite-gravity southeast

# Batch resize
for f in *.jpg; do node $SCRIPT -i "$f" -o "$SCRATCH/thumb_$f" --resize 300x300 --resize-fit cover; done
```

## How Claude Should Use This Skill

### Step 1 — Orient (always first, never skip)

**NEVER use the Read tool on image files.** Even a modest JPEG expands to many MB of base64
in context, burning tokens for the rest of the conversation. Use CLI calls instead:

```bash
# Metadata — pure text, zero image data in context
node $SCRIPT --input photo.jpg --info

# Preview — only when you need to see the image to make decisions
node $SCRIPT --input photo.jpg --preview ~/.claude/skills/edit-image-skill/scratch/preview.jpg
# then: display_file ~/.claude/skills/edit-image-skill/scratch/preview.jpg
```

The viewer renders the preview without loading it into context. Skip the preview step
when the user's description is sufficient to plan the operations.

### Step 2 — Work in the scratchpad

All intermediate files go to `~/.claude/skills/edit-image-skill/scratch/`. Use short descriptive names:
- `~/.claude/skills/edit-image-skill/scratch/preview.jpg` — orientation thumbnail
- `~/.claude/skills/edit-image-skill/scratch/step1-crop.png` — after crop
- `~/.claude/skills/edit-image-skill/scratch/step2-bw.png` — after grayscale
- `~/.claude/skills/edit-image-skill/scratch/final.png` — finished result

### Step 3 — Move the final result to the current working directory

When work is complete, copy the final file to the user's current working directory:

```bash
cp ~/.claude/skills/edit-image-skill/scratch/final.png ./result.png
```

Tell the user the filename so they know what to look for. Use `display_file` on the
copied file to show it in the viewer.

### Step 4 — Verify

Confirm the output with `--info` or by checking the JSON returned by the transform command.
Report format, dimensions, and file size to the user.

### Error handling

The script exits with code 1 on error and prints a clear message to stderr. Common issues:
- Input file not found: check the path
- Invalid crop coordinates: use `--info` first to get dimensions
- sharp not installed: run `npm install` in the scripts directory
