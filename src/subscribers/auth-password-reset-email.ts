import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { extractEmailFromEventData, sendBrevoTemplateEmail } from "../lib/email/brevo-email"

export default async function authPasswordResetEmailSubscriber({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve("logger")
  const eventId = (event as { id?: string }).id
  const email = extractEmailFromEventData(event.data)

  if (!email) {
    logger.warn?.("[brevo-email] auth.password_reset event had no email field")
    return
  }

  const resetToken = (event.data as { token?: string } | undefined)?.token
  const resetUrl = (event.data as { reset_url?: string } | undefined)?.reset_url

  await sendBrevoTemplateEmail(
    {
      to: email,
      templateKey: "auth_password_reset",
      params: {
        customer_email: email,
        token: resetToken,
        reset_url: resetUrl,
      },
      eventId,
      eventName: event.name,
    },
    logger
  )
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
