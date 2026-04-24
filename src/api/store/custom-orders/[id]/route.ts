import {
  MedusaRequest,
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"

const getCustomerId = (req: MedusaStoreRequest): string | null => {
  const authContext = req.auth_context

  if (!authContext || authContext.actor_type !== "customer") {
    return null
  }

  return authContext.actor_id
}

const withAttachments = <T extends { attachments?: unknown }>(customOrder: T) => ({
  ...customOrder,
  attachments: Array.isArray(customOrder.attachments)
    ? customOrder.attachments
    : [],
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req as MedusaStoreRequest)

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

  return res.status(200).json({ custom_order: withAttachments(custom_order) })
}
