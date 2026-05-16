import { createHash } from "node:crypto";
import sharp from "sharp";
import type { FinalBackgroundAsset } from "@/models/final-composer";

export async function createFormV2DebugBackgroundAsset(canvas: { width: number; height: number }): Promise<FinalBackgroundAsset> {
  const { width, height } = canvas;
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#F8FDFF"/><stop offset=".6" stop-color="#EAF8FF"/><stop offset="1" stop-color="#FFF1D8"/></linearGradient>
    <radialGradient id="centerLightColumn" cx="50%" cy="24%" r="58%"><stop stop-color="#FFFFFF" stop-opacity=".98"/><stop offset=".7" stop-color="#E7F9FF" stop-opacity=".54"/><stop offset="1" stop-color="#E7F9FF" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect id="centerLightColumn" x="${width * 0.3}" y="${height * 0.055}" width="${width * 0.4}" height="${height * 0.56}" rx="${width * 0.2}" fill="url(#centerLightColumn)"/>
  <rect x="${width * 0.37}" y="${height * 0.1}" width="${width * 0.26}" height="${height * 0.45}" rx="${width * 0.13}" fill="#FFFFFF" opacity=".35"/>
  <g id="leftDisplayWall" opacity=".62">
    <rect x="${width * 0.035}" y="${height * 0.32}" width="${width * 0.16}" height="${height * 0.32}" rx="18" fill="#FFFFFF" opacity=".74"/>
    <rect x="${width * 0.06}" y="${height * 0.35}" width="${width * 0.045}" height="${height * 0.06}" rx="8" fill="#FBD98B"/>
    <rect x="${width * 0.122}" y="${height * 0.35}" width="${width * 0.045}" height="${height * 0.06}" rx="8" fill="#BEE7F7"/>
    <rect x="${width * 0.06}" y="${height * 0.44}" width="${width * 0.108}" height="${height * 0.016}" rx="5" fill="#CFE6FF"/>
    <rect x="${width * 0.06}" y="${height * 0.49}" width="${width * 0.045}" height="${height * 0.06}" rx="8" fill="#D8F0C1"/>
    <rect x="${width * 0.122}" y="${height * 0.49}" width="${width * 0.045}" height="${height * 0.06}" rx="8" fill="#FFD7C6"/>
  </g>
  <g id="rightDisplayWall" opacity=".58">
    <rect x="${width * 0.805}" y="${height * 0.32}" width="${width * 0.16}" height="${height * 0.32}" rx="18" fill="#FFFFFF" opacity=".7"/>
    <circle cx="${width * 0.85}" cy="${height * 0.38}" r="${width * 0.023}" fill="#FFE7A8"/>
    <circle cx="${width * 0.91}" cy="${height * 0.38}" r="${width * 0.023}" fill="#BCEAF5"/>
    <rect x="${width * 0.835}" y="${height * 0.45}" width="${width * 0.102}" height="${height * 0.018}" rx="6" fill="#DDEBFF"/>
    <rect x="${width * 0.84}" y="${height * 0.51}" width="${width * 0.095}" height="${height * 0.055}" rx="10" fill="#FFF1C6"/>
  </g>
  <rect id="logoReserve" x="${width * 0.79}" y="${height * 0.035}" width="${width * 0.17}" height="${height * 0.075}" rx="16" fill="#FFFFFF" opacity=".46"/>
  <path id="stagePodium" d="M0 ${height * 0.82} C ${width * 0.22} ${height * 0.76}, ${width * 0.42} ${height * 0.86}, ${width * 0.58} ${height * 0.82} C ${width * 0.72} ${height * 0.78}, ${width * 0.86} ${height * 0.8}, ${width} ${height * 0.76} L ${width} ${height} L 0 ${height} Z" fill="#FFE4A8"/>
  <ellipse cx="${width * 0.31}" cy="${height * 0.8}" rx="${width * 0.06}" ry="${height * 0.028}" fill="#FFFFFF" opacity=".45"/>
  <ellipse cx="${width * 0.69}" cy="${height * 0.8}" rx="${width * 0.06}" ry="${height * 0.028}" fill="#FFFFFF" opacity=".45"/>
</svg>`;
  const input = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
  return { source: "debugFixture", input, width, height, mimeType: "image/jpeg", sha256: sha256(input) };
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
