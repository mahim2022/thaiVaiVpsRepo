import { getBaseURL } from "@lib/util/env"
import { ImageResponse } from "next/og"

export const alt = "ThaiVai Store"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  const baseUrl = getBaseURL()
  const logoUrl = `${baseUrl}/images/logo.png`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgb(19,39,68) 0%, rgb(27,58,102) 45%, rgb(181,205,233) 100%)",
          color: "white",
          fontSize: 86,
          fontWeight: 700,
          letterSpacing: "0.04em",
          gap: 28,
        }}
      >
        <img
          src={logoUrl}
          alt="ThaiVai Store logo"
          width={160}
          height={160}
          style={{ objectFit: "contain" }}
        />
        <div style={{ display: "flex" }}>ThaiVai Store</div>
      </div>
    ),
    {
      ...size,
    }
  )
}