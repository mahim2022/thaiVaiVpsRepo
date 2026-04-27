import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  normalizeAttachments,
  resolvePublicBaseUrl,
} from "../../../utils/attachment-url"

const ALLOWED_STATUSES = new Set(["submitted", "in_review", "replied", "closed"])
const withAttachments = (
  customOrder: { attachments?: unknown } & Record<string, unknown>,
  publicBaseUrl?: string | null
) => ({
  ...customOrder,
  attachments: normalizeAttachments(customOrder.attachments, publicBaseUrl),
})
const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  submitted: new Set(["in_review", "closed"]),
  in_review: new Set(["replied", "closed"]),
  replied: new Set(["closed", "in_review"]),
  closed: new Set(["closed"]),
}

const buildUpdatePayload = (
  currentStatus: string,
  body: {
    status?: string
    admin_reply?: string
  }
) => {
  const nextStatus = typeof body.status === "string" ? body.status.trim() : undefined
  const adminReply =
    typeof body.admin_reply === "string" ? body.admin_reply.trim() : undefined

  if (!nextStatus && adminReply === undefined) {
    return { error: "At least one of 'status' or 'admin_reply' must be provided" }
  }

  if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) {
    return {
      error: "Invalid 'status'. Allowed: submitted, in_review, replied, closed",
    }
  }

  const targetStatus = nextStatus || (adminReply ? "replied" : currentStatus)

  if (!ALLOWED_TRANSITIONS[currentStatus]?.has(targetStatus)) {
    return {
      error: `Invalid status transition from '${currentStatus}' to '${targetStatus}'`,
    }
  }

  if (targetStatus === "closed" && adminReply) {
    return {
      error: "Cannot set an admin reply when the status is closed",
    }
  }

  const payload: Record<string, string> = {}

  if (nextStatus) {
    payload.status = nextStatus
  } else if (adminReply) {
    payload.status = "replied"
  }

  if (adminReply !== undefined) {
    payload.admin_reply = adminReply
  }

  return { payload }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customOrderService = req.scope.resolve("customOrder") as any
  const publicBaseUrl = resolvePublicBaseUrl(req)

  const custom_order = await customOrderService
    .retrieveCustomOrder(req.params.id)
    .catch(() => null)

  if (!custom_order) {
    return res.status(404).json({ message: "Custom order not found" })
  }

  return res.status(200).json({
    custom_order: withAttachments(custom_order, publicBaseUrl),
  })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const customOrderService = req.scope.resolve("customOrder") as any
  const publicBaseUrl = resolvePublicBaseUrl(req)
  const current = await customOrderService
    .retrieveCustomOrder(req.params.id)
    .catch(() => null)

  if (!current) {
    return res.status(404).json({ message: "Custom order not found" })
  }

  const normalized = buildUpdatePayload(
    current.status,
    req.validatedBody as {
      status?: string
      admin_reply?: string
    }
  )

  if ("error" in normalized) {
    return res.status(400).json({ message: normalized.error })
  }

  await customOrderService.updateCustomOrders({
    id: req.params.id,
    ...normalized.payload,
  })

  const custom_order = await customOrderService.retrieveCustomOrder(req.params.id)

  return res.status(200).json({
    custom_order: withAttachments(custom_order, publicBaseUrl),
  })
}
