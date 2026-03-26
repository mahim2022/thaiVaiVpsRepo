import { getBaseURL } from "@lib/util/env"
import { ImageResponse } from "next/og"

export const alt = "ThaiVai Store"
export const size = {
  width: 1200,
  height: 675,
}
export const contentType = "image/png"

export default function TwitterImage() {
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
            "radial-gradient(circle at 30% 20%, rgb(181,205,233) 0%, rgb(27,58,102) 45%, rgb(15,33,57) 100%)",
          color: "white",
          fontSize: 80,
          fontWeight: 700,
          letterSpacing: "0.04em",
          gap: 24,
        }}
      >
        <img
          src={logoUrl}
          alt="ThaiVai Store logo"
          width={150}
          height={150}
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