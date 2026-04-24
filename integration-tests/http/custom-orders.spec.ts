import { readFileSync } from "fs"

const BASE_URL = "http://localhost:9000"

type JsonResponse<T> = {
  status: number
  data: T
}

type AuthTokenPayload = {
  auth_identity_id: string
  actor_id: string
  actor_type: string
}

type CustomOrderAttachment = {
  file_id: string
  url: string
  filename: string
  mime_type: string
  created_at: string
}

type CustomOrder = {
  id: string
  customer_id: string
  title: string
  description: string
  status: "submitted" | "in_review" | "replied" | "closed"
  admin_reply: string | null
  attachments?: CustomOrderAttachment[]
}

type CustomerAuth = {
  email: string
  password: string
  registerToken: string
  token: string
  payload: AuthTokenPayload
}

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+W7kAAAAASUVORK5CYII="
const oversizedBase64 = "A".repeat(8 * 1024 * 1024)

const getTokenPayload = (token: string): AuthTokenPayload => {
  const encodedPayload = token.split(".")[1]

  if (!encodedPayload) {
    throw new Error("Missing token payload")
  }

  return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"))
}

const uniqueEmail = (prefix: string) => `${prefix}+${Date.now()}@example.com`

const readPublishableApiKey = () => {
  const contents = readFileSync("my-medusa-storefront/.env", "utf8")
  const match = contents.match(/^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.+)$/m)

  if (!match?.[1]) {
    throw new Error("Missing publishable API key in my-medusa-storefront/.env")
  }

  return match[1].trim()
}

const requestJson = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<JsonResponse<T>> => {
  const response = await fetch(`${BASE_URL}${path}`, init)
  const text = await response.text()

  let data: T
  try {
    data = JSON.parse(text) as T
  } catch {
    throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 200)}`)
  }

  return {
    status: response.status,
    data,
  }
}

const registerCustomer = async (publishableApiKey: string): Promise<CustomerAuth> => {
  const email = uniqueEmail("customer-smoke")
  const password = "Passw0rd!Smoke"

  const registerResponse = await requestJson<{ token: string }>(
    "/auth/customer/emailpass/register",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": publishableApiKey,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  expect(registerResponse.status).toBe(200)

  const registerToken = registerResponse.data.token
  const registerPayload = getTokenPayload(registerToken)

  const createCustomerResponse = await requestJson<{ customer: unknown }>(
    "/store/customers",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": publishableApiKey,
        authorization: `Bearer ${registerToken}`,
      },
      body: JSON.stringify({
        email,
        first_name: "Smoke",
        last_name: "Tester",
      }),
    }
  )

  expect(createCustomerResponse.status).toBe(200)

  const loginResponse = await requestJson<{ token: string }>(
    "/auth/customer/emailpass",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": publishableApiKey,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  expect(loginResponse.status).toBe(200)

  const token = loginResponse.data.token
  const payload = getTokenPayload(token)

  expect(registerPayload.actor_type).toBe("customer")
  expect(payload.actor_type).toBe("customer")
  expect(payload.actor_id).toBeTruthy()

  return {
    email,
    password,
    registerToken,
    token,
    payload,
  }
}

const loginAdmin = async () => {
  const email = "admin@example.com"
  const password = "supersecret"

  const loginResponse = await requestJson<{ token: string }>(
    "/auth/user/emailpass",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  )

  expect(loginResponse.status).toBe(200)

  const token = loginResponse.data.token
  const payload = getTokenPayload(token)

  expect(payload.actor_type).toBe("user")
  expect(payload.actor_id).toBeTruthy()

  return {
    email,
    password,
    token,
    payload,
  }
}

const createCustomOrder = async (
  publishableApiKey: string,
  token: string,
  titleSuffix: string
) => {
  const createResponse = await requestJson<{ custom_order: CustomOrder }>(
    "/store/custom-orders",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": publishableApiKey,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: `Custom T-Shirt Run ${titleSuffix}`,
        description: "Need a custom stitched set with two logos.",
      }),
    }
  )

  expect(createResponse.status).toBe(201)
  expect(createResponse.data.custom_order.status).toBe("submitted")

  return createResponse.data.custom_order
}

jest.setTimeout(120 * 1000)

describe("Custom orders HTTP API", () => {
  it("handles customer auth, custom order creation, attachments, ownership, and admin replies", async () => {
    const publishableApiKey = readPublishableApiKey()

    const unauthenticatedListResponse = await requestJson<{ message: string }>(
      "/store/custom-orders",
      {
        headers: {
          "x-publishable-api-key": publishableApiKey,
        },
      }
    )

    expect(unauthenticatedListResponse.status).toBe(401)

    const customer = await registerCustomer(publishableApiKey)

    const createdOrder = await createCustomOrder(
      publishableApiKey,
      customer.token,
      `${Date.now()}`
    )
    expect(createdOrder.title).toContain("Custom T-Shirt Run")

    const orderId = createdOrder.id

    const attachmentResponse = await requestJson<{ custom_order: CustomOrder }>(
      `/store/custom-orders/${orderId}/attachments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${customer.token}`,
        },
        body: JSON.stringify({
          files: [
            {
              filename: "smoke-1.png",
              mime_type: "image/png",
              content_base64: tinyPngBase64,
            },
            {
              filename: "smoke-2.png",
              mime_type: "image/png",
              content_base64: tinyPngBase64,
            },
          ],
        }),
      }
    )

    expect(attachmentResponse.status).toBe(200)
    expect(attachmentResponse.data.custom_order.attachments).toHaveLength(2)

    const detailResponse = await requestJson<{ custom_order: CustomOrder }>(
      `/store/custom-orders/${orderId}`,
      {
        headers: {
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${customer.token}`,
        },
      }
    )

    expect(detailResponse.status).toBe(200)
    expect(detailResponse.data.custom_order.attachments).toHaveLength(2)

    const listResponse = await requestJson<{
      custom_orders: CustomOrder[]
      count: number
    }>("/store/custom-orders?limit=5&offset=0", {
      headers: {
        "x-publishable-api-key": publishableApiKey,
        authorization: `Bearer ${customer.token}`,
      },
    })

    expect(listResponse.status).toBe(200)
    expect(listResponse.data.count).toBe(1)
    expect(listResponse.data.custom_orders).toHaveLength(1)

    const secondCustomer = await registerCustomer(publishableApiKey)

    const forbiddenDetailResponse = await requestJson<{ message: string }>(
      `/store/custom-orders/${orderId}`,
      {
        headers: {
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${secondCustomer.token}`,
        },
      }
    )

    expect(forbiddenDetailResponse.status).toBe(404)

    const forbiddenAttachmentResponse = await requestJson<{ message: string }>(
      `/store/custom-orders/${orderId}/attachments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${secondCustomer.token}`,
        },
        body: JSON.stringify({
          files: [
            {
              filename: "smoke-3.png",
              mime_type: "image/png",
              content_base64: tinyPngBase64,
            },
          ],
        }),
      }
    )

    expect(forbiddenAttachmentResponse.status).toBe(404)

    const admin = await loginAdmin()

    const adminListResponse = await requestJson<{
      custom_orders: CustomOrder[]
      count: number
    }>("/admin/custom-orders?limit=10&offset=0", {
      headers: {
        authorization: `Bearer ${admin.token}`,
      },
    })

    expect(adminListResponse.status).toBe(200)
    expect(adminListResponse.data.count).toBeGreaterThanOrEqual(1)

    const adminPatchResponse = await requestJson<{ custom_order: CustomOrder }>(
      `/admin/custom-orders/${orderId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${admin.token}`,
        },
        body: JSON.stringify({
          status: "in_review",
          admin_reply: "Thanks, we are reviewing your request.",
        }),
      }
    )

    expect(adminPatchResponse.status).toBe(200)
    expect(adminPatchResponse.data.custom_order.status).toBe("in_review")
    expect(adminPatchResponse.data.custom_order.admin_reply).toBe(
      "Thanks, we are reviewing your request."
    )

    const updatedDetailResponse = await requestJson<{ custom_order: CustomOrder }>(
      `/store/custom-orders/${orderId}`,
      {
        headers: {
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${customer.token}`,
        },
      }
    )

    expect(updatedDetailResponse.status).toBe(200)
    expect(updatedDetailResponse.data.custom_order.status).toBe("in_review")
    expect(updatedDetailResponse.data.custom_order.admin_reply).toBe(
      "Thanks, we are reviewing your request."
    )
    expect(updatedDetailResponse.data.custom_order.attachments).toHaveLength(2)
  })

  it("rejects invalid attachments and invalid admin status transitions", async () => {
    const publishableApiKey = readPublishableApiKey()
    const customer = await registerCustomer(publishableApiKey)
    const order = await createCustomOrder(
      publishableApiKey,
      customer.token,
      `negative-${Date.now()}`
    )

    const invalidMimeResponse = await requestJson<{ message: string }>(
      `/store/custom-orders/${order.id}/attachments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${customer.token}`,
        },
        body: JSON.stringify({
          files: [
            {
              filename: "not-image.txt",
              mime_type: "text/plain",
              content_base64: tinyPngBase64,
            },
          ],
        }),
      }
    )

    expect(invalidMimeResponse.status).toBe(400)
    expect(invalidMimeResponse.data.message).toContain("Unsupported file type")

    const oversizedResponse = await requestJson<{ message: string }>(
      `/store/custom-orders/${order.id}/attachments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${customer.token}`,
        },
        body: JSON.stringify({
          files: [
            {
              filename: "too-large.png",
              mime_type: "image/png",
              content_base64: oversizedBase64,
            },
          ],
        }),
      }
    )

    // Large payloads can be rejected by route validation (400) or by body parser limits.
    expect(oversizedResponse.status).toBeGreaterThanOrEqual(400)
    expect(oversizedResponse.status).not.toBe(200)

    const detailAfterOversizedAttempt = await requestJson<{ custom_order: CustomOrder }>(
      `/store/custom-orders/${order.id}`,
      {
        headers: {
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${customer.token}`,
        },
      }
    )

    expect(detailAfterOversizedAttempt.status).toBe(200)
    expect(detailAfterOversizedAttempt.data.custom_order.attachments || []).toHaveLength(0)

    const tooManyFiles = Array.from({ length: 6 }, (_, index) => ({
      filename: `too-many-${index + 1}.png`,
      mime_type: "image/png",
      content_base64: tinyPngBase64,
    }))

    const tooManyAttachmentsResponse = await requestJson<{ message: string }>(
      `/store/custom-orders/${order.id}/attachments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": publishableApiKey,
          authorization: `Bearer ${customer.token}`,
        },
        body: JSON.stringify({ files: tooManyFiles }),
      }
    )

    expect(tooManyAttachmentsResponse.status).toBe(400)

    const admin = await loginAdmin()

    const invalidTransitionResponse = await requestJson<{ message: string }>(
      `/admin/custom-orders/${order.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${admin.token}`,
        },
        body: JSON.stringify({
          status: "replied",
          admin_reply: "Jumping directly to replied should fail from submitted.",
        }),
      }
    )

    expect(invalidTransitionResponse.status).toBe(400)
    expect(invalidTransitionResponse.data.message).toContain(
      "Invalid status transition"
    )
  })
})