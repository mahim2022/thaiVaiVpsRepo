import {
  MedusaRequest,
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"

import {
  normalizeAttachmentUrl,
  normalizeAttachments,
  resolvePublicBaseUrl,
} from "../../../../utils/attachment-url"

type AttachmentInput = {
  filename: string
  mime_type: string
  content_base64: string
}

type CustomOrderAttachment = {
  file_id: string
  url: string
  filename: string
  mime_type: string
  created_at: string
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_ATTACHMENTS_PER_ORDER = 5

const getCustomerId = (req: MedusaStoreRequest): string | null => {
  const authContext = req.auth_context

  if (!authContext || authContext.actor_type !== "customer") {
    return null
  }

  return authContext.actor_id
}

const toBase64Payload = (raw: string): string => {
  const parts = raw.split(",")
  return (parts.length > 1 ? parts[1] : raw).replace(/\s/g, "")
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req as MedusaStoreRequest)
  const publicBaseUrl = resolvePublicBaseUrl(req)

  if (!customerId) {
    return res.status(401).json({ message: "Customer authentication required" })
  }

  const customOrderService = req.scope.resolve("customOrder") as any
  const fileModuleService = req.scope.resolve("file") as any

  const custom_order = await customOrderService
    .retrieveCustomOrder(req.params.id)
    .catch(() => null)

  if (!custom_order || custom_order.customer_id !== customerId) {
    return res.status(404).json({ message: "Custom order not found" })
  }

  const currentAttachments = normalizeAttachments(custom_order.attachments)

  const body = req.validatedBody as {
    files: AttachmentInput[]
  }

  if (currentAttachments.length + body.files.length > MAX_ATTACHMENTS_PER_ORDER) {
    return res.status(400).json({
      message: `A custom order can have up to ${MAX_ATTACHMENTS_PER_ORDER} attachments`,
    })
  }

  for (const file of body.files) {
    if (!ALLOWED_MIME_TYPES.has(file.mime_type)) {
      return res.status(400).json({
        message: `Unsupported file type '${file.mime_type}'`,
      })
    }

    const content = toBase64Payload(file.content_base64)
    const size = Buffer.byteLength(content, "base64")

    if (size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        message: `File '${file.filename}' exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      })
    }
  }

  const createdFiles = await fileModuleService.createFiles(
    body.files.map((file) => ({
      filename: file.filename,
      mimeType: file.mime_type,
      content: toBase64Payload(file.content_base64),
      access: "public",
    }))
  )

  const newAttachments: CustomOrderAttachment[] = createdFiles.map(
    (created: { id: string; url: string }, index: number) => ({
      file_id: created.id,
      url: normalizeAttachmentUrl(created.url, publicBaseUrl),
      filename: body.files[index].filename,
      mime_type: body.files[index].mime_type,
      created_at: new Date().toISOString(),
    })
  )

  await customOrderService.updateCustomOrders({
    id: req.params.id,
    attachments: [...currentAttachments, ...newAttachments],
  })

  const updated = await customOrderService.retrieveCustomOrder(req.params.id)

  return res.status(200).json({
    custom_order: {
      ...updated,
      attachments: normalizeAttachments(updated.attachments, publicBaseUrl),
    },
  })
}
