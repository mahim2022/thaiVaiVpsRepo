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

  await sendBrevoTemplateEmail(
    {
      to: email,
      templateKey: "order_placed",
      params: {
        customer_email: email,
        order_id: orderId,
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
