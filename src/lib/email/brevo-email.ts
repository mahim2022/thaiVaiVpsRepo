type BrevoTemplateKey =
  | "customer_welcome"
  | "order_placed"
  | "order_shipped"
  | "order_canceled"
  | "auth_password_reset"

type SendBrevoTemplateEmailInput = {
  to: string
  templateKey: BrevoTemplateKey
  params?: Record<string, unknown>
  eventId?: string
  eventName?: string
}

type BrevoLogger = {
  info?: (message: string) => void
  warn?: (message: string) => void
  error?: (message: string) => void
}

type BrevoSendResult = {
  skipped: boolean
  messageId?: string
}

type QueryLike = {
  graph: (args: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

const RECENT_EVENT_IDS_TTL_MS = 10 * 60 * 1000
const recentEventIds = new Map<string, number>()

const templateIds: Record<BrevoTemplateKey, number> = {
  customer_welcome: Number(process.env.BREVO_TEMPLATE_ID_CUSTOMER_WELCOME || 1001),
  order_placed: Number(process.env.BREVO_TEMPLATE_ID_ORDER_PLACED || 1002),
  order_shipped: Number(process.env.BREVO_TEMPLATE_ID_ORDER_SHIPPED || 1003),
  order_canceled: Number(process.env.BREVO_TEMPLATE_ID_ORDER_CANCELED || 1004),
  auth_password_reset: Number(process.env.BREVO_TEMPLATE_ID_AUTH_PASSWORD_RESET || 1005),
}

function isBrevoEnabled() {
  return (process.env.BREVO_ENABLED || "false").toLowerCase() === "true"
}

function isSandboxMode() {
  return (process.env.BREVO_SANDBOX_MODE || "true").toLowerCase() === "true"
}

function getTimeoutMs() {
  const parsed = Number(process.env.BREVO_TIMEOUT_MS || 10000)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000
}

function getSenderConfig() {
  return {
    email: process.env.BREVO_SENDER_EMAIL || "noreply@summithire.tech",
    name: process.env.BREVO_SENDER_NAME || "Summit Hire",
  }
}

function pruneEventCache(now: number) {
  for (const [eventId, createdAt] of recentEventIds.entries()) {
    if (now - createdAt > RECENT_EVENT_IDS_TTL_MS) {
      recentEventIds.delete(eventId)
    }
  }
}

function isDuplicateEvent(eventId?: string) {
  if (!eventId) {
    return false
  }

  const now = Date.now()
  pruneEventCache(now)

  if (recentEventIds.has(eventId)) {
    return true
  }

  recentEventIds.set(eventId, now)
  return false
}

function validateRequiredEnv() {
  if (!process.env.BREVO_API_KEY) {
    return "Missing BREVO_API_KEY"
  }

  if (!process.env.BREVO_SENDER_EMAIL) {
    return "Missing BREVO_SENDER_EMAIL"
  }

  return null
}

function buildEmailPayload(input: SendBrevoTemplateEmailInput) {
  const sender = getSenderConfig()
  const headers: Record<string, string> = {}

  if (input.eventId) {
    headers["X-Medusa-Event-Id"] = input.eventId
  }

  if (input.eventName) {
    headers["X-Medusa-Event-Name"] = input.eventName
  }

  return {
    sender,
    to: [{ email: input.to }],
    templateId: templateIds[input.templateKey],
    params: input.params || {},
    headers,
  }
}

function buildRequestHeaders() {
  const headers: Record<string, string> = {
    "accept": "application/json",
    "api-key": process.env.BREVO_API_KEY || "",
    "content-type": "application/json",
  }

  if (isSandboxMode()) {
    headers["X-Sib-Sandbox"] = "drop"
  }

  return headers
}

export async function sendBrevoTemplateEmail(
  input: SendBrevoTemplateEmailInput,
  logger?: BrevoLogger
): Promise<BrevoSendResult> {
  if (!isBrevoEnabled()) {
    logger?.info?.("[brevo-email] skipped send because BREVO_ENABLED=false")
    return { skipped: true }
  }

  if (isDuplicateEvent(input.eventId)) {
    logger?.warn?.(`[brevo-email] duplicate event detected, skipping (${input.eventId})`)
    return { skipped: true }
  }

  const envError = validateRequiredEnv()
  if (envError) {
    logger?.error?.(`[brevo-email] ${envError}`)
    return { skipped: true }
  }

  const payload = buildEmailPayload(input)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs())

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: buildRequestHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const responseBody = await response.text()

    if (!response.ok) {
      logger?.error?.(
        `[brevo-email] send failed (${response.status}) for ${input.templateKey}: ${responseBody}`
      )
      return { skipped: true }
    }

    let messageId: string | undefined

    try {
      const parsed = JSON.parse(responseBody) as { messageId?: string }
      messageId = parsed.messageId
    } catch (_error) {
      // Keep response parsing non-fatal so the request can still be considered successful.
    }

    logger?.info?.(
      `[brevo-email] sent template ${input.templateKey} to ${input.to}${
        messageId ? ` (messageId: ${messageId})` : ""
      }${isSandboxMode() ? " [sandbox]" : ""}`
    )

    return {
      skipped: false,
      messageId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger?.error?.(`[brevo-email] request error for ${input.templateKey}: ${message}`)
    return { skipped: true }
  } finally {
    clearTimeout(timeout)
  }
}

export function extractEmailFromEventData(data: Record<string, unknown> | undefined) {
  if (!data) {
    return undefined
  }

  const senderEmail = (process.env.BREVO_SENDER_EMAIL || "").toLowerCase()
  const possibleEmails = [
    data.customer_email,
    (data.customer as { email?: unknown } | undefined)?.email,
    (data.order as { email?: unknown } | undefined)?.email,
    (data.shipping_address as { email?: unknown } | undefined)?.email,
    (data.billing_address as { email?: unknown } | undefined)?.email,
    data.email,
    data.to,
    data.recipient,
  ]

  const validEmails: string[] = []

  for (const value of possibleEmails) {
    if (typeof value !== "string") {
      continue
    }

    const normalized = value.trim().toLowerCase()
    if (!normalized.includes("@")) {
      continue
    }

    if (!validEmails.includes(normalized)) {
      validEmails.push(normalized)
    }
  }

  const nonSenderEmail = validEmails.find((email) => email !== senderEmail)
  if (nonSenderEmail) {
    return nonSenderEmail
  }

  if (validEmails.length > 0) {
    return validEmails[0]
  }

  return undefined
}

function extractEntityId(
  data: Record<string, unknown> | undefined,
  idKeys: string[]
): string | undefined {
  if (!data) {
    return undefined
  }

  for (const key of idKeys) {
    const value = data[key]
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
  }

  return undefined
}

export function extractCustomerIdFromEventData(data: Record<string, unknown> | undefined) {
  return extractEntityId(data, ["customer_id", "id"])
}

export function extractOrderIdFromEventData(data: Record<string, unknown> | undefined) {
  return extractEntityId(data, ["order_id", "id"])
}

export async function resolveCustomerEmailById(
  query: QueryLike,
  customerId: string | undefined
): Promise<string | undefined> {
  if (!customerId) {
    return undefined
  }

  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })

  const email = data?.[0]?.email
  if (typeof email === "string" && email.includes("@")) {
    return email
  }

  return undefined
}

export async function resolveOrderEmailById(
  query: QueryLike,
  orderId: string | undefined
): Promise<string | undefined> {
  if (!orderId) {
    return undefined
  }

  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "email"],
    filters: { id: orderId },
  })

  const email = data?.[0]?.email
  if (typeof email === "string" && email.includes("@")) {
    return email
  }

  return undefined
}

export function extractShipmentIdFromEventData(data: Record<string, unknown> | undefined) {
  return extractEntityId(data, ["shipment_id", "id"])
}

export async function resolveOrderEmailByShipmentId(
  query: QueryLike,
  shipmentId: string | undefined
): Promise<{ email?: string; orderId?: string }> {
  if (!shipmentId) {
    return {}
  }

  try {
    const { data } = await query.graph({
      entity: "shipment",
      fields: [
        "id",
        "order_id",
        "order.email",
        "fulfillment.order_id",
        "fulfillment.order.id",
        "fulfillment.order.email",
      ],
      filters: { id: shipmentId },
    })

    const shipment = data?.[0]
    if (!shipment) {
      return {}
    }

    const orderIdCandidates = [
      shipment.order_id,
      (shipment.order as { id?: unknown } | undefined)?.id,
      (shipment.fulfillment as { order_id?: unknown } | undefined)?.order_id,
      (shipment.fulfillment as { order?: { id?: unknown } } | undefined)?.order?.id,
    ]

    let resolvedOrderId: string | undefined
    for (const candidate of orderIdCandidates) {
      if (typeof candidate === "string" && candidate.length > 0) {
        resolvedOrderId = candidate
        break
      }
    }

    const emailCandidates = [
      (shipment.order as { email?: unknown } | undefined)?.email,
      (shipment.fulfillment as { order?: { email?: unknown } } | undefined)?.order?.email,
    ]

    let resolvedEmail: string | undefined
    for (const candidate of emailCandidates) {
      if (typeof candidate === "string" && candidate.includes("@")) {
        resolvedEmail = candidate
        break
      }
    }

    if (!resolvedEmail && resolvedOrderId) {
      resolvedEmail = await resolveOrderEmailById(query, resolvedOrderId)
    }

    return {
      email: resolvedEmail,
      orderId: resolvedOrderId,
    }
  } catch (_error) {
    return {}
  }
}

export async function resolveOrderEmailByFulfillmentId(
  query: QueryLike,
  fulfillmentId: string | undefined
): Promise<{ email?: string; orderId?: string }> {
  if (!fulfillmentId) {
    return {}
  }

  try {
    const { data } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "order_id", "order.id", "order.email"],
      filters: { id: fulfillmentId },
    })

    const fulfillment = data?.[0]
    if (!fulfillment) {
      return {}
    }

    const orderIdCandidates = [
      fulfillment.order_id,
      (fulfillment.order as { id?: unknown } | undefined)?.id,
    ]

    let resolvedOrderId: string | undefined
    for (const candidate of orderIdCandidates) {
      if (typeof candidate === "string" && candidate.length > 0) {
        resolvedOrderId = candidate
        break
      }
    }

    const orderEmail = (fulfillment.order as { email?: unknown } | undefined)?.email
    let resolvedEmail: string | undefined

    if (typeof orderEmail === "string" && orderEmail.includes("@")) {
      resolvedEmail = orderEmail
    }

    if (!resolvedEmail && resolvedOrderId) {
      resolvedEmail = await resolveOrderEmailById(query, resolvedOrderId)
    }

    return {
      email: resolvedEmail,
      orderId: resolvedOrderId,
    }
  } catch (_error) {
    return {}
  }
}
