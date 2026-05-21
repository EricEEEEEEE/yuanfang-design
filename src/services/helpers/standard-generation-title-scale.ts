import type { TitleBox, TitleLockupBlueprint, TitleLockupBox, TitleUnitBox } from "@/config/title-lockup-blueprint";
import type { ForbiddenZone } from "@/services/background-layout-intelligence.service";

export const STANDARD_TITLE_FROM_CANVAS = { width: 1000, height: 1000 };

export function scaleTitleLockupBlueprintToCanvas(blueprint: TitleLockupBlueprint, fromCanvas: { width: number; height: number }, toCanvas: { width: number; height: number }): TitleLockupBlueprint {
  const copy = JSON.parse(JSON.stringify(blueprint)) as TitleLockupBlueprint;
  const sx = toCanvas.width / fromCanvas.width;
  const sy = toCanvas.height / fromCanvas.height;
  const ss = Math.min(sx, sy);
  copy.lockupBox = scaleLockupBox(copy.lockupBox, sx, sy, ss);
  copy.spatialContract.anchorBox = scaleBox(copy.spatialContract.anchorBox, sx, sy);
  copy.spatialContract.lockupBox = scaleLockupBox(copy.spatialContract.lockupBox, sx, sy, ss);
  copy.spatialContract.collisionPolicy.minGapPx = scaleScalar(copy.spatialContract.collisionPolicy.minGapPx, ss);
  copy.collisionPolicy.minGapPx = scaleScalar(copy.collisionPolicy.minGapPx, ss);
  copy.titleUnits = copy.titleUnits.map((unit) => ({ ...unit, unitBox: scaleUnitBox(unit.unitBox, sx, sy) }));
  copy.subtitleLockup = {
    ...copy.subtitleLockup,
    subtitleBox: copy.subtitleLockup.subtitleBox ? scaleUnitBox(copy.subtitleLockup.subtitleBox, sx, sy) : null,
  };
  return copy;
}

export function scaleForbiddenZonesToCanvas(zones: ForbiddenZone[], fromCanvas: { width: number; height: number }, toCanvas: { width: number; height: number }): ForbiddenZone[] {
  const sx = toCanvas.width / fromCanvas.width;
  const sy = toCanvas.height / fromCanvas.height;
  return zones.map((zone) => ({ ...zone, ...scaleBox(zone, sx, sy) }));
}

function scaleBox<T extends TitleBox>(box: T, sx: number, sy: number): T {
  return { ...box, x: scaleScalar(box.x, sx), y: scaleScalar(box.y, sy), width: scaleScalar(box.width, sx), height: scaleScalar(box.height, sy) };
}
function scaleUnitBox(box: TitleUnitBox, sx: number, sy: number): TitleUnitBox {
  return { ...scaleBox(box, sx, sy), maxWidth: scaleScalar(box.maxWidth, sx), maxHeight: scaleScalar(box.maxHeight, sy), rotationDeg: box.rotationDeg };
}
function scaleLockupBox(box: TitleLockupBox, sx: number, sy: number, ss: number): TitleLockupBox {
  return { ...scaleBox(box, sx, sy), safePadding: scaleScalar(box.safePadding, ss), allowedOverflowPx: scaleScalar(box.allowedOverflowPx, ss) };
}
function scaleScalar(value: number, scale: number): number { return Math.round(value * scale * 100) / 100; }
