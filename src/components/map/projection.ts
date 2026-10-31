import type { GeoPoint } from "@/lib/listings/types";

/**
 * Tashkent, framed for the schematic map. The box is chosen so that its aspect ratio at
 * this latitude matches the 5:4 canvas (0.28° of longitude × cos 41.3° ≈ 1.25 × 0.17° of
 * latitude), which keeps distances honest in both directions.
 */
export const MAP_BOUNDS = { west: 69.12, east: 69.4, south: 41.215, north: 41.385 } as const;
export const MAP_VIEWBOX = { width: 1000, height: 800 } as const;

/** Position on the canvas, in viewBox units; null when the point is outside the frame. */
export function projectToViewBox(point: GeoPoint): { x: number; y: number } | null {
  const { west, east, south, north } = MAP_BOUNDS;
  if (point.longitude < west || point.longitude > east || point.latitude < south || point.latitude > north) {
    return null;
  }
  return {
    x: ((point.longitude - west) / (east - west)) * MAP_VIEWBOX.width,
    y: ((north - point.latitude) / (north - south)) * MAP_VIEWBOX.height,
  };
}

/** The same position as CSS percentages of the canvas box. */
export function projectToPercent(point: GeoPoint): { left: number; top: number } | null {
  const projected = projectToViewBox(point);
  if (!projected) return null;
  return {
    left: (projected.x / MAP_VIEWBOX.width) * 100,
    top: (projected.y / MAP_VIEWBOX.height) * 100,
  };
}
