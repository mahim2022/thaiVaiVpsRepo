import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Button, Container, Heading } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

type CustomOrder = {
  id: string
  customer_id: string
  title: string
  description: string
  status: "submitted" | "in_review" | "replied" | "closed"
  admin_reply: string | null
  attachments?: Array<{
    file_id: string
    url: string
    filename: string
    mime_type: string
    created_at: string
  }>
  created_at: string
}

type ListResponse = {
  custom_orders: CustomOrder[]
}

const getAttachmentCount = (order: CustomOrder) => order.attachments?.length || 0

const statusOptions: Array<CustomOrder["status"]> = [
  "submitted",
  "in_review",
  "replied",
  "closed",
]

const CustomOrdersPage = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAttachmentUrl, setSelectedAttachmentUrl] = useState<string | null>(null)
  const [selectedAttachmentName, setSelectedAttachmentName] = useState<string | null>(null)
  const [status, setStatus] = useState<CustomOrder["status"]>("submitted")
  const [adminReply, setAdminReply] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedId) || null,
    [orders, selectedId]
  )

  const loadOrders = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/admin/custom-orders?limit=100&offset=0`, {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Failed to load custom orders")
      }

      const data = (await res.json()) as ListResponse
      setOrders(data.custom_orders || [])

      if (!selectedId && data.custom_orders?.length) {
        // Prefer an order with attachments so admins immediately see previews.
        const first =
          data.custom_orders.find((order) => getAttachmentCount(order) > 0) ||
          data.custom_orders[0]

        setSelectedId(first.id)
        setStatus(first.status)
        setAdminReply(first.admin_reply || "")

        if (first.attachments?.length) {
          setSelectedAttachmentUrl(first.attachments[0].url)
          setSelectedAttachmentName(first.attachments[0].filename)
        } else {
          setSelectedAttachmentUrl(null)
          setSelectedAttachmentName(null)
        }
      }
    } catch (e: any) {
      setError(e?.message || "Could not load custom orders")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (!selectedOrder) {
      return
    }

    setStatus(selectedOrder.status)
    setAdminReply(selectedOrder.admin_reply || "")
    if (selectedOrder.attachments?.length) {
      setSelectedAttachmentUrl(selectedOrder.attachments[0].url)
      setSelectedAttachmentName(selectedOrder.attachments[0].filename)
    } else {
      setSelectedAttachmentUrl(null)
      setSelectedAttachmentName(null)
    }
  }, [selectedOrder])

  const onSave = async () => {
    if (!selectedOrder) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/admin/custom-orders/${selectedOrder.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          admin_reply: adminReply,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || "Failed to save custom order")
      }

      await loadOrders()
    } catch (e: any) {
      setError(e?.message || "Could not save custom order")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Custom Orders</Heading>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-[360px_1fr]">
        <div className="rounded border border-ui-border-base">
          <div className="border-b border-ui-border-base px-4 py-3 text-small-plus">
            Requests
          </div>
          <div className="max-h-[620px] overflow-auto">
            {isLoading ? (
              <p className="px-4 py-3 text-ui-fg-subtle">Loading...</p>
            ) : orders.length ? (
              orders.map((order) => (
                <button
                  key={order.id}
                  className="block w-full border-b border-ui-border-base px-4 py-3 text-left hover:bg-ui-bg-subtle"
                  onClick={() => setSelectedId(order.id)}
                  type="button"
                >
                  <p className="text-small-plus">{order.title}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-small-regular text-ui-fg-subtle">
                      {order.status}
                    </p>
                    {getAttachmentCount(order) > 0 ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        {getAttachmentCount(order)} image{getAttachmentCount(order) > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="rounded bg-ui-bg-subtle px-2 py-0.5 text-xs text-ui-fg-subtle">
                        no images
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-ui-fg-subtle">No requests yet.</p>
            )}
          </div>
        </div>

        <div className="rounded border border-ui-border-base p-4">
          {selectedOrder ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-small-plus">{selectedOrder.title}</p>
                <p className="text-small-regular text-ui-fg-subtle whitespace-pre-wrap">
                  {selectedOrder.description}
                </p>
                  {selectedOrder.attachments?.length ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-small-plus">Attachments</p>
                    {selectedAttachmentUrl ? (
                      <div className="rounded border border-ui-border-base bg-ui-bg-subtle p-3">
                        <img
                          src={selectedAttachmentUrl}
                          alt={selectedAttachmentName || "Attachment preview"}
                          className="max-h-80 w-full rounded object-contain bg-white"
                        />
                        <p className="mt-2 text-small-regular text-ui-fg-subtle">
                          {selectedAttachmentName}
                        </p>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      {selectedOrder.attachments.map((attachment) => (
                        <a
                          key={attachment.file_id}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            setSelectedAttachmentUrl(attachment.url)
                            setSelectedAttachmentName(attachment.filename)
                          }}
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
                  ) : (
                    <div className="mt-3 rounded border border-ui-border-base bg-ui-bg-subtle p-3 text-small-regular text-ui-fg-subtle">
                      No images were uploaded for this request.
                    </div>
                  )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-small-plus">
                  Status
                  <select
                    className="rounded border border-ui-border-base bg-ui-bg-field px-3 py-2"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomOrder["status"])}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="text-small-regular text-ui-fg-subtle">
                  <p>Customer ID</p>
                  <p>{selectedOrder.customer_id}</p>
                </div>
              </div>

              <label className="flex flex-col gap-1 text-small-plus">
                Admin reply
                <textarea
                  rows={5}
                  className="rounded border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                />
              </label>

              <div className="flex justify-end">
                <Button onClick={onSave} isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-ui-fg-subtle">Select a request from the list.</p>
          )}
        </div>
      </div>

      {error ? (
        <div className="px-6 pb-4 text-small-regular text-rose-500">{error}</div>
      ) : null}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Custom Orders",
  icon: ChatBubbleLeftRight,
})

export const handle = {
  breadcrumb: () => "Custom Orders",
}

export default CustomOrdersPage
