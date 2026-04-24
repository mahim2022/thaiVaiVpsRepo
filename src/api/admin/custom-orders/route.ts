import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const withAttachments = <T extends { attachments?: unknown }>(customOrder: T) => ({
  ...customOrder,
  attachments: Array.isArray(customOrder.attachments)
    ? customOrder.attachments
    : [],
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customOrderService = req.scope.resolve("customOrder") as any
  const limit = Math.min(Number(req.validatedQuery.limit) || 20, 100)
  const offset = Math.max(Number(req.validatedQuery.offset) || 0, 0)

  const [custom_orders, count] = await customOrderService.listAndCountCustomOrders(
    {},
    {
      take: limit,
      skip: offset,
      order: {
        created_at: "DESC",
      },
    }
  )

  return res.status(200).json({
    custom_orders: custom_orders.map(withAttachments),
    count,
    limit,
    offset,
  })
}
