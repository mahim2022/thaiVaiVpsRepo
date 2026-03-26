import { getBaseURL } from "@lib/util/env"
import { ImageResponse } from "next/og"

export const size = {
  width: 512,
  height: 512,
}
export const contentType = "image/png"

export default function Icon() {
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
            "linear-gradient(160deg, rgb(19,39,68) 0%, rgb(27,58,102) 70%, rgb(181,205,233) 100%)",
        }}
      >
        <img
          src={logoUrl}
          alt="ThaiVai Store logo"
          width={340}
          height={340}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}