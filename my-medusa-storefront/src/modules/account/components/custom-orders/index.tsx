"use client"

import { createCustomOrder, StoreCustomOrder } from "@lib/data/custom-orders"
import { CheckCircleMiniSolid, XCircleSolid } from "@medusajs/icons"
import { Heading, IconButton, Text } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useMemo, useState, type ChangeEvent } from "react"

type CustomOrdersProps = {
  orders: StoreCustomOrder[]
}

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
])

const statusLabel: Record<StoreCustomOrder["status"], string> = {
  submitted: "Submitted",
  in_review: "In review",
  replied: "Replied",
  closed: "Closed",
}

export default function CustomOrders({ orders }: CustomOrdersProps) {
  const router = useRouter()
  const [showSuccess, setShowSuccess] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<
    Array<{ name: string; url: string }>
  >([])

  const [state, formAction] = useActionState(createCustomOrder, {
    success: false,
    error: null,
    custom_order: null,
  })

  const selectedFilesKey = useMemo(
    () => selectedFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|"),
    [selectedFiles]
  )

  useEffect(() => {
    const previews = selectedFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }))

    setSelectedFilePreviews(previews)

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [selectedFilesKey])

  useEffect(() => {
    if (state.success && state.custom_order) {
      setShowSuccess(true)
      setSelectedFiles([])
      setAttachmentError(null)
      setSelectedFilePreviews([])
      router.refresh()
    }
  }, [state.success, state.custom_order, router])

  const onAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    if (!files.length) {
      setSelectedFiles([])
      setAttachmentError(null)
      return
    }

    if (files.length > MAX_ATTACHMENTS) {
      setSelectedFiles([])
      setAttachmentError(`You can upload up to ${MAX_ATTACHMENTS} images.`)
      event.target.value = ""
      return
    }

    const unsupported = files.find((file) => !ALLOWED_ATTACHMENT_TYPES.has(file.type))

    if (unsupported) {
      setSelectedFiles([])
      setAttachmentError(`'${unsupported.name}' is not a supported image type.`)
      event.target.value = ""
      return
    }

    const oversized = files.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES)

    if (oversized) {
      setSelectedFiles([])
      setAttachmentError(`'${oversized.name}' exceeds 5MB.`)
      event.target.value = ""
      return
    }

    setAttachmentError(null)
    setSelectedFiles(files)
  }

  return (
    <div className="w-full" data-testid="custom-orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Custom Orders</h1>
        <p className="text-base-regular">
          Tell us what you need and our team will review your request and reply
          from the admin dashboard.
        </p>
      </div>

      <div className="flex flex-col gap-y-10">
        <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-y-4">
          <Heading level="h2">New Request</Heading>
          <Input
            label="Title"
            name="title"
            required
            maxLength={200}
            data-testid="custom-order-title-input"
          />
          <div className="flex flex-col gap-y-2">
            <label
              htmlFor="custom-order-description"
              className="txt-compact-medium-plus"
            >
              Description<span className="text-rose-500">*</span>
            </label>
            <textarea
              id="custom-order-description"
              name="description"
              required
              rows={5}
              className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
              data-testid="custom-order-description-input"
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <label htmlFor="custom-order-attachments" className="txt-compact-medium-plus">
              Attach images (optional)
            </label>
            <input
              id="custom-order-attachments"
              name="attachments"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              multiple
              onChange={onAttachmentChange}
              data-testid="custom-order-attachments-input"
            />
            <Text className="text-small-regular text-ui-fg-subtle">
              Up to 5 images, max 5MB each.
            </Text>
            {attachmentError ? (
              <Text className="text-small-regular text-rose-500">{attachmentError}</Text>
            ) : null}
            {selectedFilePreviews.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {selectedFilePreviews.map((preview) => (
                  <div
                    key={preview.url}
                    className="overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-subtle"
                  >
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="h-28 w-full object-cover"
                    />
                    <p className="px-2 py-1 text-small-regular text-ui-fg-subtle">
                      {preview.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end">
            <SubmitButton
              className="w-fit"
              data-testid="custom-order-submit-button"
            >
              Submit request
            </SubmitButton>
          </div>

          {!state.success && state.error && (
            <Text className="text-base-regular text-rose-500 text-right">
              {state.error}
            </Text>
          )}

          {showSuccess && (
            <div className="flex justify-between p-4 bg-neutral-50 shadow-borders-base w-full self-stretch items-center">
              <div className="flex gap-x-2 items-center">
                <CheckCircleMiniSolid className="w-4 h-4 text-emerald-500" />
                <div className="flex flex-col gap-y-1">
                  <Text className="text-medium-plus text-neutral-950">
                    Request submitted
                  </Text>
                  <Text className="text-base-regular text-neutral-600">
                    We will review and update you here.
                  </Text>
                </div>
              </div>
              <IconButton
                variant="transparent"
                className="h-fit"
                onClick={() => setShowSuccess(false)}
              >
                <XCircleSolid className="w-4 h-4 text-neutral-500" />
              </IconButton>
            </div>
          )}
        </form>

        <div className="flex flex-col gap-y-4">
          <Heading level="h2">My Requests</Heading>
          {orders?.length ? (
            <div className="flex flex-col gap-y-3" data-testid="custom-orders-list">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-md border border-ui-border-base p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-x-3">
                    <h3 className="text-base-semi">{order.title}</h3>
                    <span className="text-small-regular text-ui-fg-subtle">
                      {statusLabel[order.status]}
                    </span>
                  </div>
                  <p className="text-small-regular text-ui-fg-subtle whitespace-pre-wrap">
                    {order.description}
                  </p>
                  {order.attachments?.length ? (
                    <div className="mt-3 flex flex-col gap-y-2">
                      <p className="text-small-plus">Attachments</p>
                      <div className="flex flex-wrap gap-3">
                        {order.attachments.map((attachment) => (
                          <a
                            key={attachment.file_id}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex w-24 flex-col gap-1 rounded border border-ui-border-base p-1 hover:bg-ui-bg-subtle"
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="h-20 w-full rounded object-cover"
                              loading="lazy"
                            />
                            <span className="line-clamp-2 text-small-regular text-ui-fg-subtle group-hover:text-ui-fg-base">
                              {attachment.filename}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {order.admin_reply ? (
                    <div className="mt-3 rounded-md bg-ui-bg-subtle p-3">
                      <p className="text-small-plus">Admin reply</p>
                      <p className="text-small-regular whitespace-pre-wrap">
                        {order.admin_reply}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-regular text-ui-fg-subtle" data-testid="custom-orders-empty">
              You have no custom requests yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
