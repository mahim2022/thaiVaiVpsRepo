import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendBrevoTemplateEmail } from "../lib/email/brevo-email"

export default async function sendBrevoTestEmail({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const targetEmail = args?.[0]

  if (!targetEmail) {
    throw new Error("Please provide a recipient email. Example: yarn email:test you@example.com")
  }

  const result = await sendBrevoTemplateEmail(
    {
      to: targetEmail,
      templateKey: "customer_welcome",
      params: {
        customer_email: targetEmail,
        source: "cli.send-brevo-test",
      },
      eventName: "cli.send_brevo_test",
    },
    logger
  )

  logger.info(
    `[brevo-email] test send completed for ${targetEmail} (skipped=${result.skipped}, messageId=${
      result.messageId || "none"
    })`
  )
}
