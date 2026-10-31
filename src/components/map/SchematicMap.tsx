import { TASHKENT_DISTRICTS } from "@/lib/listings/filters";

import { MAP_VIEWBOX, projectToPercent } from "./projection";

/**
 * A schematic of Tashkent — not a map tile, and never presented as one.
 *
 * Ring roads, the main avenues, the Bo‘zsuv and Anhor canals and a few parks are drawn in
 * approximately the right places so the markers sit in a recognisable city, in the app's
 * map language: paper roads on warm land, the prices being the only ink. District labels
 * are positioned from real district-centre coordinates by the same projection as markers.
 */

/** Approximate district positions, for labels only — nudged so they clear the markers. */
const DISTRICT_CENTRES: Record<(typeof TASHKENT_DISTRICTS)[number]["value"], { latitude: number; longitude: number }> = {
  Yunusobod: { latitude: 41.352, longitude: 69.31 },
  Olmazor: { latitude: 41.352, longitude: 69.215 },
  Shayxontohur: { latitude: 41.335, longitude: 69.205 },
  "Mirzo Ulugbek": { latitude: 41.322, longitude: 69.345 },
  Mirobod: { latitude: 41.284, longitude: 69.302 },
  Yakkasaroy: { latitude: 41.272, longitude: 69.258 },
  Chilonzor: { latitude: 41.262, longitude: 69.188 },
  Uchtepa: { latitude: 41.31, longitude: 69.165 },
  Sergeli: { latitude: 41.235, longitude: 69.268 },
};

const CENTRE = { x: 570, y: 350 };

export function SchematicMap() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <svg
        viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <defs>
          <pattern id="map-blocks" width="36" height="30" patternUnits="userSpaceOnUse">
            <rect x="3" y="3" width="30" height="24" rx="3" className="fill-map-block" />
          </pattern>
        </defs>

        <rect width="1000" height="800" className="fill-map-land" />
        <rect width="1000" height="800" fill="url(#map-blocks)" />

        {/* Parks */}
        <g className="fill-map-park">
          <path d="M700 170c40-18 95-8 118 22 20 27 6 64-30 76-42 14-96 4-110-28-12-28-6-56 22-70Z" />
          <path d="M380 300c26-14 70-10 86 12 14 20 0 46-28 54-30 8-66-2-74-24-6-18 0-34 16-42Z" />
          <path d="M600 520c30-12 70-4 82 20 10 22-8 44-38 48-30 4-60-8-64-30-4-16 4-30 20-38Z" />
          <path d="M500 210c18-8 44-4 52 10 8 14-2 30-22 34-20 4-40-4-44-18-2-12 4-21 14-26Z" />
          <path d="M150 610c34-10 76 2 84 26 8 22-14 40-46 42-32 2-60-12-62-32-2-16 8-30 24-36Z" />
        </g>

        {/* Canals: Bo‘zsuv crosses the city south-west from the north-east; Anhor branches through the centre. */}
        <g fill="none" strokeLinecap="round" className="stroke-map-water">
          <path d="M1000 110C860 170 760 210 660 250S470 330 380 420 200 560 0 640" strokeWidth="14" />
          <path d="M640 258C600 300 560 330 540 370S500 470 470 560 430 720 420 800" strokeWidth="9" />
        </g>

        {/* Roads: the outer and inner rings, then the avenues radiating from the centre. */}
        <g fill="none" strokeLinecap="round" className="stroke-map-road">
          <ellipse cx={CENTRE.x} cy={CENTRE.y + 40} rx="430" ry="345" strokeWidth="14" />
          <ellipse cx={CENTRE.x} cy={CENTRE.y} rx="185" ry="150" strokeWidth="11" />
          {[
            [600, 0],
            [1000, 220],
            [1000, 560],
            [690, 800],
            [300, 800],
            [0, 520],
            [0, 300],
            [140, 0],
          ].map(([x, y]) => (
            <line key={`${x}-${y}`} x1={CENTRE.x} y1={CENTRE.y} x2={x} y2={y} strokeWidth="9" />
          ))}
        </g>
        <circle cx={CENTRE.x} cy={CENTRE.y} r="16" className="fill-map-road" />
      </svg>

      <ul className="hidden sm:block">
        {TASHKENT_DISTRICTS.map((district) => {
          const position = projectToPercent(DISTRICT_CENTRES[district.value]);
          if (!position) return null;
          return (
            <li
              key={district.value}
              style={{ left: `${position.left}%`, top: `${position.top}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted/70"
            >
              {district.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
