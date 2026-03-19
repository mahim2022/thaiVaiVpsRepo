import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { sendBrevoTemplateEmail } from "../../../lib/email/brevo-email";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  res.sendStatus(200);
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const logger = req.scope.resolve("logger")
  const body = (req.body || {}) as {
    email?: string
  }

  if (!body.email) {
    return res.status(400).json({
      message: "Missing 'email' in request body",
    })
  }

  const result = await sendBrevoTemplateEmail(
    {
      to: body.email,
      templateKey: "customer_welcome",
      params: {
        customer_email: body.email,
        source: "admin.custom.test_route",
      },
      eventName: "admin.custom.test",
    },
    logger
  )

  return res.status(200).json({
    ok: true,
    result,
  })
}
