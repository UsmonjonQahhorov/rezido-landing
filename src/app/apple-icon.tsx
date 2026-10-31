import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The same mark as icon.svg, rasterised for iOS home screens. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF4E7",
        }}
      >
        <div style={{ width: 68, height: 68, borderRadius: 10, background: "#E1552F", transform: "rotate(45deg)" }} />
      </div>
    ),
    size,
  );
}
