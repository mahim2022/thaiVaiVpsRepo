import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  extractEmailFromEventData,
  extractShipmentIdFromEventData,
  resolveOrderEmailByFulfillmentId,
  resolveOrderEmailByShipmentId,
  resolveOrderEmailById,
  sendBrevoTemplateEmail,
} from "../lib/email/brevo-email"

export default async function orderShippedEmailSubscriber({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const eventId = (event as { id?: string }).id
  const entityId = extractShipmentIdFromEventData(event.data)
  const looksLikeFulfillmentId = !!entityId?.startsWith("ful_")
  const shipmentResolution = looksLikeFulfillmentId
    ? await resolveOrderEmailByFulfillmentId(query, entityId)
    : await resolveOrderEmailByShipmentId(query, entityId)
  const orderId = shipmentResolution.orderId
  const directEmail = extractEmailFromEventData(event.data)
  const resolvedEmail = await resolveOrderEmailById(query, orderId)
  const email = directEmail || shipmentResolution.email || resolvedEmail

  if (!email) {
    logger.warn?.(
      `[brevo-email] shipment.created event had no resolvable email (entityId=${entityId || "n/a"}, orderId=${orderId || "n/a"})`
    )
    return
  }

  await sendBrevoTemplateEmail(
    {
      to: email,
      templateKey: "order_shipped",
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
  event: "shipment.created",
}
