import {
  MedusaRequest,
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"

import {
  normalizeAttachments,
  resolvePublicBaseUrl,
} from "../../utils/attachment-url"

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
  const limit = Math.min(Number(req.validatedQuery.limit) || 20, 100)
  const offset = Math.max(Number(req.validatedQuery.offset) || 0, 0)

  const [custom_orders, count] = await customOrderService.listAndCountCustomOrders(
    {
      customer_id: customerId,
    },
    {
      take: limit,
      skip: offset,
      order: {
        created_at: "DESC",
      },
    }
  )

  return res.status(200).json({
    custom_orders: custom_orders.map((order: any) =>
      withAttachments(order, publicBaseUrl)
    ),
    count,
    limit,
    offset,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req as MedusaStoreRequest)
  const publicBaseUrl = resolvePublicBaseUrl(req)

  if (!customerId) {
    return res.status(401).json({ message: "Customer authentication required" })
  }

  const { title, description } = req.validatedBody as {
    title: string
    description: string
  }

  const customOrderService = req.scope.resolve("customOrder") as any
  const created = await customOrderService.createCustomOrders({
    customer_id: customerId,
    title,
    description,
    status: "submitted",
  })

  return res.status(201).json({
    custom_order: withAttachments(created, publicBaseUrl),
  })
}
