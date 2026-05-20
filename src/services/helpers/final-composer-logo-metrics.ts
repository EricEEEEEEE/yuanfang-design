import sharp from "sharp";
import type {
  FinalLogoPlacement,
  FinalLogoVariantAsset,
} from "@/models/final-composer";
import type { LogoBox } from "@/services/helpers/final-composer-logo-placement";

export type LogoRawImage = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
};

export type LogoRegionMetrics = {
  brightness: number;
  warmth: number;
  stddev: number;
  edgeDensity: number;
  complexity: number;
};

export async function rawBackground(
  input: Buffer,
  canvas: { width: number; height: number },
): Promise<LogoRawImage> {
  const { data, info } = await sharp(input)
    .resize(canvas.width, canvas.height, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

export function regionMetrics(bg: LogoRawImage, box: LogoBox): LogoRegionMetrics {
  let n = 0, sum = 0, sum2 = 0, red = 0, blue = 0, edges = 0, edgeN = 0;
  const left = Math.max(0, Math.floor(box.left));
  const top = Math.max(0, Math.floor(box.top));
  const right = Math.min(bg.width - 2, Math.ceil(box.left + box.width));
  const bottom = Math.min(bg.height - 2, Math.ceil(box.top + box.height));
  for (let y = top; y < bottom; y += 4) {
    for (let x = left; x < right; x += 4) {
      const current = pixelLum(bg, x, y);
      const next = Math.max(Math.abs(current - pixelLum(bg, x + 1, y)), Math.abs(current - pixelLum(bg, x, y + 1)));
      n += 1; sum += current; sum2 += current * current; red += bg.data[idx(bg, x, y)]; blue += bg.data[idx(bg, x, y) + 2];
      edgeN += 1; if (next > 26) edges += 1;
    }
  }
  const brightness = n ? sum / n : 255;
  const variance = n ? Math.max(0, sum2 / n - brightness * brightness) : 0;
  const stddev = Math.sqrt(variance);
  const edgeDensity = edgeN ? edges / edgeN : 0;
  return { brightness, warmth: n ? (red - blue) / n : 0, stddev, edgeDensity, complexity: clamp(stddev / 82 * 0.58 + edgeDensity * 0.42) };
}

export async function contrastScore(
  bg: LogoRawImage,
  place: FinalLogoPlacement,
  variant: FinalLogoVariantAsset,
): Promise<number> {
  const raw = await sharp(variant.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const scores: number[] = [];
  const step = Math.max(1, Math.floor(raw.info.width / 90));
  for (let y = 0; y < raw.info.height; y += step) {
    for (let x = 0; x < raw.info.width; x += step) {
      const i = (y * raw.info.width + x) * raw.info.channels;
      if (raw.data[i + 3] < 32) continue;
      const logoLum = lum(raw.data[i], raw.data[i + 1], raw.data[i + 2]);
      const bgLum = pixelLum(bg, place.left + x, place.top + y);
      scores.push(clamp(Math.abs(logoLum - bgLum) / 118));
    }
  }
  scores.sort((a, b) => a - b);
  return scores.length ? scores[Math.floor(scores.length * 0.28)] : 0;
}

export function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function pixelLum(bg: LogoRawImage, x: number, y: number): number {
  const i = idx(bg, Math.round(x), Math.round(y));
  return lum(bg.data[i], bg.data[i + 1], bg.data[i + 2]);
}

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function idx(bg: LogoRawImage, x: number, y: number): number {
  const safeX = Math.max(0, Math.min(bg.width - 1, x));
  const safeY = Math.max(0, Math.min(bg.height - 1, y));
  return (safeY * bg.width + safeX) * bg.channels;
}
