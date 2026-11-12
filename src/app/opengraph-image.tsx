import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getDictionary } from "@/i18n";

export const alt = getDictionary().meta.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = (path: string) => readFile(join(process.cwd(), "src/assets", path));

/** Share card: the hero headline in the brand type beside the hero photograph. */
export default async function OpenGraphImage() {
  const { hero } = getDictionary();
  const [display, mono, photo] = await Promise.all([
    asset("fonts/SpaceGrotesk-Bold.otf"),
    asset("fonts/IBMPlexMono-Medium.ttf"),
    asset("photos/tashkent-residential-brick.jpg"),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FBF4E7" }}>
        <div
          style={{
            width: 660,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 56px 60px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: "#E1552F", transform: "rotate(45deg)" }} />
            <div style={{ fontFamily: "Space Grotesk", fontSize: 40, color: "#2A2118", letterSpacing: -1.5 }}>rezido</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "IBM Plex Mono",
                fontSize: 20,
                color: "#C44421",
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              {hero.eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 24,
                fontFamily: "Space Grotesk",
                fontSize: 78,
                lineHeight: 1.02,
                letterSpacing: -3,
                color: "#2A2118",
              }}
            >
              <span>{hero.titleLead}</span>
              <span style={{ color: "#E1552F" }}>{hero.titleAccent}</span>
            </div>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders this embedded image into a PNG. */}
        <img
          src={`data:image/jpeg;base64,${photo.toString("base64")}`}
          alt=""
          width={540}
          height={630}
          style={{ width: 540, height: 630, objectFit: "cover" }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: display, weight: 700, style: "normal" },
        { name: "IBM Plex Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
