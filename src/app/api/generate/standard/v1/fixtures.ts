import { createHash } from "node:crypto";
import sharp from "sharp";
import type { FinalBackgroundAsset } from "@/models/final-composer";

export async function createDebugBackgroundAsset(canvas: { width: number; height: number }): Promise<FinalBackgroundAsset> {
  const svg = `<svg width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="stageBg" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#F9FDFF"/><stop offset="0.56" stop-color="#EAF8FF"/><stop offset="1" stop-color="#FFF1D6"/></linearGradient>
      <radialGradient id="centerLightColumn" cx="50%" cy="24%" r="54%"><stop stop-color="#FFFFFF" stop-opacity="0.98"/><stop offset="0.68" stop-color="#E6F8FF" stop-opacity="0.5"/><stop offset="1" stop-color="#E6F8FF" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${canvas.width}" height="${canvas.height}" fill="url(#stageBg)"/>
    <rect id="centerLightColumn" x="${canvas.width * 0.31}" y="${canvas.height * 0.055}" width="${canvas.width * 0.38}" height="${canvas.height * 0.56}" rx="${canvas.width * 0.19}" fill="url(#centerLightColumn)"/>
    <rect x="${canvas.width * 0.37}" y="${canvas.height * 0.095}" width="${canvas.width * 0.26}" height="${canvas.height * 0.46}" rx="${canvas.width * 0.13}" fill="#FFFFFF" opacity="0.32"/>
    <g id="leftDisplayWall" opacity="0.62"><rect x="${canvas.width * 0.035}" y="${canvas.height * 0.32}" width="${canvas.width * 0.16}" height="${canvas.height * 0.32}" rx="18" fill="#FFFFFF" opacity="0.74"/><rect x="${canvas.width * 0.06}" y="${canvas.height * 0.35}" width="${canvas.width * 0.045}" height="${canvas.height * 0.06}" rx="8" fill="#FBD98B"/><rect x="${canvas.width * 0.122}" y="${canvas.height * 0.35}" width="${canvas.width * 0.045}" height="${canvas.height * 0.06}" rx="8" fill="#BEE7F7"/><rect x="${canvas.width * 0.06}" y="${canvas.height * 0.44}" width="${canvas.width * 0.108}" height="${canvas.height * 0.016}" rx="5" fill="#CFE6FF"/><rect x="${canvas.width * 0.06}" y="${canvas.height * 0.49}" width="${canvas.width * 0.045}" height="${canvas.height * 0.06}" rx="8" fill="#D8F0C1"/><rect x="${canvas.width * 0.122}" y="${canvas.height * 0.49}" width="${canvas.width * 0.045}" height="${canvas.height * 0.06}" rx="8" fill="#FFD7C6"/></g>
    <g id="rightDisplayWall" opacity="0.58"><rect x="${canvas.width * 0.805}" y="${canvas.height * 0.32}" width="${canvas.width * 0.16}" height="${canvas.height * 0.32}" rx="18" fill="#FFFFFF" opacity="0.7"/><circle cx="${canvas.width * 0.85}" cy="${canvas.height * 0.38}" r="${canvas.width * 0.023}" fill="#FFE7A8"/><circle cx="${canvas.width * 0.91}" cy="${canvas.height * 0.38}" r="${canvas.width * 0.023}" fill="#BCEAF5"/><rect x="${canvas.width * 0.835}" y="${canvas.height * 0.45}" width="${canvas.width * 0.102}" height="${canvas.height * 0.018}" rx="6" fill="#DDEBFF"/><rect x="${canvas.width * 0.84}" y="${canvas.height * 0.51}" width="${canvas.width * 0.095}" height="${canvas.height * 0.055}" rx="10" fill="#FFF1C6"/></g>
    <rect id="logoReserve" x="${canvas.width * 0.79}" y="${canvas.height * 0.035}" width="${canvas.width * 0.17}" height="${canvas.height * 0.075}" rx="16" fill="#FFFFFF" opacity="0.46"/>
    <path id="stagePodium" d="M0 ${canvas.height * 0.82} C ${canvas.width * 0.22} ${canvas.height * 0.76}, ${canvas.width * 0.42} ${canvas.height * 0.86}, ${canvas.width * 0.58} ${canvas.height * 0.82} C ${canvas.width * 0.72} ${canvas.height * 0.78}, ${canvas.width * 0.86} ${canvas.height * 0.8}, ${canvas.width} ${canvas.height * 0.76} L ${canvas.width} ${canvas.height} L 0 ${canvas.height} Z" fill="#FFE4A8"/>
    <ellipse cx="${canvas.width * 0.31}" cy="${canvas.height * 0.8}" rx="${canvas.width * 0.06}" ry="${canvas.height * 0.028}" fill="#FFFFFF" opacity="0.45"/>
    <ellipse cx="${canvas.width * 0.69}" cy="${canvas.height * 0.8}" rx="${canvas.width * 0.06}" ry="${canvas.height * 0.028}" fill="#FFFFFF" opacity="0.45"/>
  </svg>`;
  const input = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
  return { source: "debugFixture", input, width: canvas.width, height: canvas.height, mimeType: "image/jpeg", sha256: sha256(input) };
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
