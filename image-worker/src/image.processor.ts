import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';

const WATERMARK_CONFIG = {
  width: 220,
  height: 60,
  text: 'EduPlatform',
  fontSize: 28,
  x: 10,
  y: 40,
  fill: 'white',
  opacity: 0.75,
  gravity: 'southeast', 
} as const;

const IMAGE_PROCESSING_CONFIG = {
  targetWidth: 800,
  withoutEnlargement: true,
  outputFormat: 'jpeg' as const,
  jpegQuality: 80,
} as const;

export async function processImage(
  inputPath: string,
  outputPath: string,
): Promise<void> {

  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const watermarkSvg = Buffer.from(`
    <svg width="${WATERMARK_CONFIG.width}" height="${WATERMARK_CONFIG.height}">
      <text
        x="${WATERMARK_CONFIG.x}"
        y="${WATERMARK_CONFIG.y}"
        font-size="${WATERMARK_CONFIG.fontSize}"
        fill="${WATERMARK_CONFIG.fill}"
        opacity="${WATERMARK_CONFIG.opacity}"
      >${WATERMARK_CONFIG.text}</text>
    </svg>
  `);

  await sharp(inputPath)
    .rotate() 
    .resize({
      width: IMAGE_PROCESSING_CONFIG.targetWidth,
      withoutEnlargement: IMAGE_PROCESSING_CONFIG.withoutEnlargement,
    })
    .jpeg({ quality: IMAGE_PROCESSING_CONFIG.jpegQuality })
    .composite([{
      input: watermarkSvg,
      gravity: WATERMARK_CONFIG.gravity,
    }])
    .toFile(outputPath);
}