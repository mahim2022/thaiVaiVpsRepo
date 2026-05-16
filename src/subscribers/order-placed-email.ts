import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  extractEmailFromEventData,
  extractOrderIdFromEventData,
  resolveOrderEmailById,
  sendBrevoTemplateEmail,
} from "../lib/email/brevo-email"

export default async function orderPlacedEmailSubscriber({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const eventId = (event as { id?: string }).id
  const orderId = extractOrderIdFromEventData(event.data)
  const directEmail = extractEmailFromEventData(event.data)
  const resolvedEmail = await resolveOrderEmailById(query, orderId)
  const email = directEmail || resolvedEmail

  if (!email) {
    logger.warn?.(
      `[brevo-email] order.placed event had no resolvable email (orderId=${orderId || "n/a"})`
    )
    return
  }

  // Fetch order details to provide richer template params (items, totals, customer name)
  let orderRecord: any = undefined
  try {
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "currency_code",
        "customer.first_name",
        "customer.last_name",
        "billing_address",
        "billing_address.first_name",
        "billing_address.last_name",
        "items",
        "items.title",
        "items.thumbnail",
        "items.unit_price",
        "items.quantity",
      ],
      filters: { id: orderId },
    })

    orderRecord = data?.[0]
  } catch (_err) {
    // ignore and fall back to minimal params
  }

  const customerFirstName =
    orderRecord?.customer?.first_name || orderRecord?.billing_address?.first_name || ""
  const customerLastName =
    orderRecord?.customer?.last_name || orderRecord?.billing_address?.last_name || ""
  const customerName = [customerFirstName, customerLastName].filter(Boolean).join(" ") || undefined

  const items = Array.isArray(orderRecord?.items)
    ? orderRecord.items.map((it: any) => {
        const unitCents = Number(it?.unit_price || 0)
        const qty = Number(it?.quantity || 0)
        const unit = Number.isFinite(unitCents) ? unitCents / 100 : undefined
        const lineTotal = typeof unit === "number" ? unit * qty : undefined
        return {
          title: it?.title,
          image: it?.thumbnail,
          unit_price_cents: unitCents,
          unit_price: unit,
          quantity: qty,
          line_total: lineTotal,
        }
      })
    : []

  await sendBrevoTemplateEmail(
    {
      to: email,
      templateKey: "order_placed",
      params: {
        customer_email: email,
        order_id: orderId,
        order_display_id: orderRecord?.display_id,
        order_total: orderRecord?.total ? Number(orderRecord.total) / 100 : undefined,
        order_currency: orderRecord?.currency_code,
        customer_name: customerName,
        items,
      },
      eventId,
      eventName: event.name,
    },
    logger
  )
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
