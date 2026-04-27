import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  normalizeAttachments,
  resolvePublicBaseUrl,
} from "../../utils/attachment-url"

const withAttachments = (
  customOrder: { attachments?: unknown } & Record<string, unknown>,
  publicBaseUrl?: string | null
) => ({
  ...customOrder,
  attachments: normalizeAttachments(customOrder.attachments, publicBaseUrl),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customOrderService = req.scope.resolve("customOrder") as any
  const publicBaseUrl = resolvePublicBaseUrl(req)
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
    custom_orders: custom_orders.map((order: any) =>
      withAttachments(order, publicBaseUrl)
    ),
    count,
    limit,
    offset,
  })
}
