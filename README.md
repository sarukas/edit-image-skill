# edit-image-skill

A Claude Code skill for image manipulation using [Sharp](https://sharp.pixelplumbing.com/) — the high-performance Node.js image processing library.

## What it does

Gives Claude a CLI tool to resize, crop, rotate, flip, convert formats, apply filters, extract metadata, and composite images — all without loading full image files into context.

## Operations supported

| Operation | Flag |
|-----------|------|
| Metadata / info | `--info` |
| Context-safe preview thumbnail | `--preview PATH` |
| Resize (WxH, Wx, xH) | `--resize 800x600` |
| Crop / extract region | `--crop left,top,width,height` |
| Rotate (degrees or EXIF auto) | `--rotate 90` / `--rotate auto` |
| Flip vertical / Flop horizontal | `--flip` / `--flop` |
| Format conversion | `--format webp\|jpeg\|png\|avif\|tiff` |
| Quality (jpeg/webp/avif) | `--quality 80` |
| Grayscale | `--grayscale` |
| Blur (gaussian) | `--blur 5` |
| Sharpen | `--sharpen` / `--sharpen-sigma 2` |
| Negate / invert | `--negate` |
| Normalize contrast | `--normalize` |
| Gamma correction | `--gamma 2.2` |
| Colour tint | `--tint "#FF6600"` |
| Composite / watermark overlay | `--composite logo.png --composite-gravity southeast` |
| Trim borders | `--trim` |
| Rounded corners | `--round 40` |

Multiple operations can be combined in a single command.

## Install

```bash
git clone https://github.com/sarukas/edit-image-skill.git
cd edit-image-skill/scripts && npm install
```

Then install as a Claude Code skill by copying (or symlinking) the root folder into your skills directory:

```bash
cp -r edit-image-skill ~/.claude/skills/edit-image
# or for project-level install:
cp -r edit-image-skill .claude/skills/edit-image
```

## Usage

```bash
SCRIPT="scripts/image-sharp.js"
SCRATCH="scratch/"

# Get metadata (no image loaded into context)
node $SCRIPT --input photo.jpg --info

# Generate a small preview for orientation
node $SCRIPT --input photo.jpg --preview $SCRATCH/preview.jpg

# Resize to 800px wide, keep aspect ratio
node $SCRIPT -i photo.jpg -o $SCRATCH/out.jpg --resize 800x

# Square crop + grayscale + WebP in one command
node $SCRIPT -i photo.jpg -o $SCRATCH/out.webp \
  --crop 0,0,1200,1200 --grayscale --format webp --quality 85

# Rotate 90 degrees and flip
node $SCRIPT -i photo.jpg -o $SCRATCH/out.jpg --rotate 90 --flip

# Add watermark in bottom-right corner
node $SCRIPT -i photo.jpg -o $SCRATCH/out.jpg \
  --composite logo.png --composite-gravity southeast

# Batch resize all JPEGs
for f in *.jpg; do
  node $SCRIPT -i "$f" -o "$SCRATCH/thumb_$f" --resize 300x300 --resize-fit cover
done
```

## Workflow

The skill enforces a context-efficient pattern:

1. **Orient** — `--info` for dimensions/format (text only), `--preview` for a 7KB thumbnail instead of loading the full image
2. **Work** — all intermediate files go to `scratch/`
3. **Deliver** — final result is copied to the current working directory

## Structure

```
edit-image-skill/
├── SKILL.md          ← Claude skill instructions
├── scratch/          ← working directory (gitignored contents)
└── scripts/
    ├── image-sharp.js
    └── package.json
```

## Requirements

- Node.js >= 18
- npm (for `sharp` and `yargs` dependencies)

## License

MIT
