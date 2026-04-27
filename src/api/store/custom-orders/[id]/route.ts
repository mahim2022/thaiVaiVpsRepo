import {
  MedusaRequest,
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"

import {
  normalizeAttachments,
  resolvePublicBaseUrl,
} from "../../../utils/attachment-url"

const getCustomerId = (req: MedusaStoreRequest): string | null => {
  const authContext = req.auth_context

  if (!authContext || authContext.actor_type !== "customer") {
    return null
  }

  return authContext.actor_id
}

const withAttachments = (
  customOrder: { attachments?: unknown } & Record<string, unknown>,
  publicBaseUrl?: string | null
) => ({
  ...customOrder,
  attachments: normalizeAttachments(customOrder.attachments, publicBaseUrl),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req as MedusaStoreRequest)
  const publicBaseUrl = resolvePublicBaseUrl(req)

  if (!customerId) {
    return res.status(401).json({ message: "Customer authentication required" })
  }

  const customOrderService = req.scope.resolve("customOrder") as any

  const custom_order = await customOrderService
    .retrieveCustomOrder(req.params.id)
    .catch(() => null)

  if (!custom_order || custom_order.customer_id !== customerId) {
    return res.status(404).json({ message: "Custom order not found" })
  }

  return res.status(200).json({
    custom_order: withAttachments(custom_order, publicBaseUrl),
  })
}
