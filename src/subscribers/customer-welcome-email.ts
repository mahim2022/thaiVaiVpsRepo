import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  extractCustomerIdFromEventData,
  extractEmailFromEventData,
  resolveCustomerEmailById,
  sendBrevoTemplateEmail,
} from "../lib/email/brevo-email"

export default async function customerWelcomeEmailSubscriber({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const eventId = (event as { id?: string }).id
  const directEmail = extractEmailFromEventData(event.data)
  const customerId = extractCustomerIdFromEventData(event.data)
  const resolvedEmail = await resolveCustomerEmailById(query, customerId)
  const email = directEmail || resolvedEmail

  if (!email) {
    logger.warn?.(
      `[brevo-email] customer.created event had no resolvable email (customerId=${customerId || "n/a"})`
    )
    return
  }

  await sendBrevoTemplateEmail(
    {
      to: email,
      templateKey: "customer_welcome",
      params: {
        customer_email: email,
      },
      eventId,
      eventName: event.name,
    },
    logger
  )
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
