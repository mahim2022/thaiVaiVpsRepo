"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"

export type StoreCustomOrderAttachment = {
  file_id: string
  url: string
  filename: string
  mime_type: string
  created_at: string
}

export type StoreCustomOrder = {
  id: string
  customer_id: string
  title: string
  description: string
  status: "submitted" | "in_review" | "replied" | "closed"
  admin_reply: string | null
  attachments?: StoreCustomOrderAttachment[]
  created_at: string
  updated_at: string
}

type StoreCustomOrdersListResponse = {
  custom_orders: StoreCustomOrder[]
  count: number
  limit: number
  offset: number
}

type StoreCustomOrderResponse = {
  custom_order: StoreCustomOrder
}

const fileToBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer).toString("base64")
}

export const listCustomOrders = async (limit: number = 20, offset: number = 0) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("custom-orders")),
  }

  return sdk.client
    .fetch<StoreCustomOrdersListResponse>(`/store/custom-orders`, {
      method: "GET",
      query: {
        limit,
        offset,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ custom_orders }) => custom_orders)
    .catch((err) => medusaError(err))
}

export const retrieveCustomOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("custom-orders")),
  }

  return sdk.client
    .fetch<StoreCustomOrderResponse>(`/store/custom-orders/${id}`, {
      method: "GET",
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ custom_order }) => custom_order)
    .catch((err) => medusaError(err))
}

export const createCustomOrder = async (
  state: {
    success: boolean
    error: string | null
    custom_order: StoreCustomOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  custom_order: StoreCustomOrder | null
}> => {
  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim()
  const files = (formData.getAll("attachments") as File[]).filter(
    (value) => value && value.size > 0
  )

  if (!title || !description) {
    return {
      success: false,
      error: "Title and description are required",
      custom_order: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<StoreCustomOrderResponse>(`/store/custom-orders`, {
      method: "POST",
      headers,
      body: {
        title,
        description,
      },
      cache: "no-store",
    })
    .then(async ({ custom_order }) => {
      if (files.length) {
        const serializedFiles = await Promise.all(
          files.map(async (file) => ({
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            content_base64: await fileToBase64(file),
          }))
        )

        const uploadRes = await sdk.client.fetch<StoreCustomOrderResponse>(
          `/store/custom-orders/${custom_order.id}/attachments`,
          {
            method: "POST",
            headers,
            body: {
              files: serializedFiles,
            },
            cache: "no-store",
          }
        )

        custom_order = uploadRes.custom_order
      }

      const cacheTag = await getCacheTag("custom-orders")

      if (cacheTag) {
        revalidateTag(cacheTag)
      }

      return {
        success: true,
        error: null,
        custom_order,
      }
    })
    .catch((err) => {
      return {
        success: false,
        error: err?.message || "Could not create custom order",
        custom_order: null,
      }
    })
}
