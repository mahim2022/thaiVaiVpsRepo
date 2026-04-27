import { MedusaRequest } from "@medusajs/framework/http"

type AttachmentLike = {
  file_id: string
  url: string
  filename: string
  mime_type: string
  created_at: string
}

const INTERNAL_HOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "host.docker.internal",
  "medusa",
]

const isInternalHost = (hostname: string) => {
  const host = hostname.toLowerCase()
  return INTERNAL_HOST_PATTERNS.some(
    (pattern) => host === pattern || host.endsWith(`.${pattern}`)
  )
}

const asString = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null
  }

  return Array.isArray(value) ? value[0] : value
}

const getBaseFromHeaders = (req: MedusaRequest): string | null => {
  const forwardedHost = asString(req.headers["x-forwarded-host"])
  const host = forwardedHost || asString(req.headers.host)

  if (!host) {
    return null
  }

  const forwardedProto = asString(req.headers["x-forwarded-proto"])
  const protocol = forwardedProto || "https"

  return `${protocol}://${host}`
}

export const resolvePublicBaseUrl = (req: MedusaRequest): string | null => {
  const envUrl = process.env.MEDUSA_BACKEND_URL?.trim()

  if (envUrl) {
    try {
      const parsed = new URL(envUrl)
      if (!isInternalHost(parsed.hostname)) {
        return `${parsed.protocol}//${parsed.host}`
      }
    } catch {
      // Ignore invalid URL and try request headers.
    }
  }

  return getBaseFromHeaders(req)
}

export const normalizeAttachmentUrl = (
  inputUrl: string,
  publicBaseUrl?: string | null
): string => {
  if (!inputUrl) {
    return inputUrl
  }

  if (inputUrl.startsWith("/")) {
    if (!publicBaseUrl) {
      return inputUrl
    }

    return `${publicBaseUrl.replace(/\/$/, "")}${inputUrl}`
  }

  try {
    const parsedInput = new URL(inputUrl)

    if (!publicBaseUrl || !isInternalHost(parsedInput.hostname)) {
      return inputUrl
    }

    const parsedBase = new URL(publicBaseUrl)

    return `${parsedBase.protocol}//${parsedBase.host}${parsedInput.pathname}${parsedInput.search}${parsedInput.hash}`
  } catch {
    return inputUrl
  }
}

export const normalizeAttachments = (
  value: unknown,
  publicBaseUrl?: string | null
): AttachmentLike[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return (value as AttachmentLike[]).map((attachment) => ({
    ...attachment,
    url: normalizeAttachmentUrl(attachment.url, publicBaseUrl),
  }))
}
