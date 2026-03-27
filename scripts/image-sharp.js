#!/usr/bin/env node
/**
 * image-sharp.js
 * CLI image manipulation tool powered by Sharp
 * Usage: node image-sharp.js --input <file> --output <file> [options]
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// CLI argument definition
// ---------------------------------------------------------------------------
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 -i <input> -o <output> [options]')
  .example('$0 -i photo.jpg -o out.jpg --resize 800x600', 'Resize to 800x600')
  .example('$0 -i photo.jpg -o out.webp --format webp --quality 80', 'Convert to WebP')
  .example('$0 -i photo.jpg --info', 'Show image metadata')

  // Core
  .option('input',  { alias: 'i', type: 'string', description: 'Input image path' })
  .option('output', { alias: 'o', type: 'string', description: 'Output image path' })
  .option('info',    { type: 'boolean', default: false, description: 'Print metadata and exit (no output needed)' })
  .option('preview', { type: 'string',  description: 'Generate a 400px-wide JPEG thumbnail to this path for visual orientation (context-safe)' })

  // Geometry
  .option('resize',      { type: 'string',  description: 'WxH, W (height auto), or xH (width auto). e.g. 800x600, 800x, x600' })
  .option('resize-fit',  { type: 'string',  default: 'cover', description: 'Fit mode: cover|contain|fill|inside|outside' })
  .option('crop',        { type: 'string',  description: 'Extract region: left,top,width,height (e.g. 100,50,640,480)' })
  .option('rotate',      { type: 'string',  description: 'Degrees clockwise, or "auto" for EXIF-based rotation' })
  .option('flip',        { type: 'boolean', default: false, description: 'Flip vertically (top-to-bottom mirror)' })
  .option('flop',        { type: 'boolean', default: false, description: 'Flop horizontally (left-to-right mirror)' })
  .option('trim',        { type: 'boolean', default: false, description: 'Trim border pixels' })

  // Format & quality
  .option('format',  { type: 'string', description: 'Output format: jpeg|jpg|png|webp|avif|tiff|gif' })
  .option('quality', { type: 'number', description: 'Output quality 1-100 (jpeg/webp/avif)' })

  // Colour / filters
  .option('grayscale',       { type: 'boolean', default: false, description: 'Convert to greyscale' })
  .option('negate',          { type: 'boolean', default: false, description: 'Invert colours' })
  .option('normalize',       { type: 'boolean', default: false, description: 'Normalise contrast (histogram stretch)' })
  .option('blur',            { type: 'number',  description: 'Gaussian blur sigma (0.3-1000)' })
  .option('sharpen',         { type: 'boolean', default: false, description: 'Apply default sharpening' })
  .option('sharpen-sigma',   { type: 'number',  description: 'Sharpening sigma (overrides --sharpen)' })
  .option('gamma',           { type: 'number',  description: 'Gamma correction value (e.g. 2.2)' })
  .option('tint',            { type: 'string',  description: 'Colour tint: hex (#FF6600) or CSS name' })

  // Compositing
  .option('composite',         { type: 'string', description: 'Path to overlay/watermark image' })
  .option('composite-gravity', { type: 'string', default: 'center', description: 'Gravity: center|north|south|east|west|northeast|northwest|southeast|southwest' })
  .option('composite-blend',   { type: 'string', default: 'over', description: 'Blend mode: over|multiply|screen|overlay|darken|lighten' })

  .help('h').alias('h', 'help')
  .argv;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function parseResize(str) {
  // Formats accepted: "800x600", "800x", "x600", "800"
  if (!str) return null;
  const m = str.match(/^(\d*)x(\d*)$/i);
  if (m) {
    return {
      width:  m[1] ? parseInt(m[1]) : undefined,
      height: m[2] ? parseInt(m[2]) : undefined,
    };
  }
  // Plain number = width only
  if (/^\d+$/.test(str)) return { width: parseInt(str) };
  die(`Invalid --resize value "${str}". Expected formats: 800x600, 800x, x600, 800`);
}

function parseCrop(str) {
  const parts = str.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    die(`Invalid --crop value "${str}". Expected: left,top,width,height`);
  }
  return { left: parts[0], top: parts[1], width: parts[2], height: parts[3] };
}

function resolveFormat(fmt, outputPath) {
  if (fmt) return fmt.replace('jpg', 'jpeg').toLowerCase();
  const ext = path.extname(outputPath).slice(1).toLowerCase();
  if (ext === 'jpg') return 'jpeg';
  return ext || null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // --- Input validation ---
  if (!argv.input) die('--input (-i) is required');
  if (!fs.existsSync(argv.input)) die(`Input file not found: ${argv.input}`);

  const img = sharp(argv.input, { failOn: 'none' });

  // --- Info mode ---
  if (argv.info) {
    const meta = await img.metadata();
    console.log(JSON.stringify({
      file:        argv.input,
      format:      meta.format,
      width:       meta.width,
      height:      meta.height,
      channels:    meta.channels,
      hasAlpha:    meta.hasAlpha,
      colorSpace:  meta.space,
      density:     meta.density,
      exif:        meta.exif ? '<present>' : null,
      icc:         meta.icc  ? '<present>' : null,
      fileSize:    fs.statSync(argv.input).size,
      fileSizeKB:  Math.round(fs.statSync(argv.input).size / 1024),
    }, null, 2));
    return;
  }

  // --- Preview mode: context-safe thumbnail for orientation ---
  if (argv.preview) {
    const previewPath = argv.preview;
    const previewDir = path.dirname(path.resolve(previewPath));
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
    const meta = await sharp(argv.input, { failOn: 'none' }).metadata();
    await sharp(argv.input, { failOn: 'none' })
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(previewPath);
    const previewSize = fs.statSync(previewPath).size;
    console.log(JSON.stringify({
      preview:       previewPath,
      sourceWidth:   meta.width,
      sourceHeight:  meta.height,
      sourceFormat:  meta.format,
      sourceSizeKB:  Math.round(fs.statSync(argv.input).size / 1024),
      previewSizeKB: Math.round(previewSize / 1024),
    }, null, 2));
    return;
  }

  // --- Output validation ---
  if (!argv.output) die('--output (-o) is required (or use --info / --preview for inspection only)');

  // Ensure output directory exists
  const outDir = path.dirname(path.resolve(argv.output));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Chain operations in logical order
  let pipeline = img;

  // 1. Auto-rotate (EXIF) or manual rotate
  if (argv.rotate) {
    if (argv.rotate === 'auto') {
      pipeline = pipeline.rotate();
    } else {
      const deg = parseFloat(argv.rotate);
      if (isNaN(deg)) die(`--rotate value must be a number or "auto", got: ${argv.rotate}`);
      pipeline = pipeline.rotate(deg);
    }
  }

  // 2. Flip / Flop
  if (argv.flip) pipeline = pipeline.flip();
  if (argv.flop) pipeline = pipeline.flop();

  // 3. Crop (extract) before resize
  if (argv.crop) {
    const { left, top, width, height } = parseCrop(argv.crop);
    pipeline = pipeline.extract({ left, top, width, height });
  }

  // 4. Resize
  if (argv.resize) {
    const { width, height } = parseResize(argv.resize);
    const fitMode = argv['resize-fit'] || 'cover';
    const validFits = ['cover', 'contain', 'fill', 'inside', 'outside'];
    if (!validFits.includes(fitMode)) die(`Invalid --resize-fit "${fitMode}". Valid: ${validFits.join(', ')}`);
    pipeline = pipeline.resize({ width, height, fit: fitMode });
  }

  // 5. Trim
  if (argv.trim) pipeline = pipeline.trim();

  // 6. Greyscale
  if (argv.grayscale) pipeline = pipeline.grayscale();

  // 7. Negate
  if (argv.negate) pipeline = pipeline.negate();

  // 8. Normalise
  if (argv.normalize) pipeline = pipeline.normalise();

  // 9. Gamma
  if (argv.gamma !== undefined) {
    pipeline = pipeline.gamma(argv.gamma);
  }

  // 10. Blur
  if (argv.blur !== undefined) {
    if (argv.blur < 0.3) die('--blur sigma must be >= 0.3');
    pipeline = pipeline.blur(argv.blur);
  }

  // 11. Sharpen
  if (argv['sharpen-sigma'] !== undefined) {
    pipeline = pipeline.sharpen({ sigma: argv['sharpen-sigma'] });
  } else if (argv.sharpen) {
    pipeline = pipeline.sharpen();
  }

  // 12. Tint
  if (argv.tint) {
    pipeline = pipeline.tint(argv.tint);
  }

  // 13. Composite overlay
  if (argv.composite) {
    if (!fs.existsSync(argv.composite)) die(`Composite file not found: ${argv.composite}`);
    const gravityMap = {
      center: 'centre', north: 'north', south: 'south', east: 'east', west: 'west',
      northeast: 'northeast', northwest: 'northwest', southeast: 'southeast', southwest: 'southwest',
      centre: 'centre',
    };
    const gravity = gravityMap[argv['composite-gravity']] || 'centre';
    pipeline = pipeline.composite([{
      input: argv.composite,
      gravity,
      blend: argv['composite-blend'] || 'over',
    }]);
  }

  // 14. Output format + quality
  const fmt = resolveFormat(argv.format, argv.output);
  const quality = argv.quality;

  if (fmt) {
    const fmtOptions = quality !== undefined ? { quality } : {};
    switch (fmt) {
      case 'jpeg': pipeline = pipeline.jpeg(fmtOptions); break;
      case 'png':  pipeline = pipeline.png(fmtOptions);  break;
      case 'webp': pipeline = pipeline.webp(fmtOptions); break;
      case 'avif': pipeline = pipeline.avif(fmtOptions); break;
      case 'tiff': pipeline = pipeline.tiff(fmtOptions); break;
      case 'gif':  pipeline = pipeline.gif();            break;
      default:
        console.warn(`WARN: Unknown format "${fmt}", letting Sharp infer from extension`);
    }
  } else if (quality !== undefined) {
    console.warn('WARN: --quality specified without --format; quality may be ignored');
  }

  // Write output
  const info = await pipeline.toFile(argv.output);
  const outSize = fs.statSync(argv.output).size;

  console.log(JSON.stringify({
    success: true,
    output: argv.output,
    format: info.format,
    width: info.width,
    height: info.height,
    channels: info.channels,
    fileSizeKB: Math.round(outSize / 1024),
  }, null, 2));
}

main().catch(err => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
