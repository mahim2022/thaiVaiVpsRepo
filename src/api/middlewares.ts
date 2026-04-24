import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { z } from "@medusajs/deps/zod"

const listCustomOrdersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createCustomOrderSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
})

const updateCustomOrderSchema = z.object({
  status: z.enum(["submitted", "in_review", "replied", "closed"]).optional(),
  admin_reply: z.string().trim().max(5000).optional(),
})

const uploadCustomOrderAttachmentsSchema = z.object({
  files: z
    .array(
      z.object({
        filename: z.string().trim().min(1).max(255),
        mime_type: z.string().trim().min(1).max(100),
        content_base64: z.string().trim().min(1),
      })
    )
    .min(1)
    .max(5),
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/custom-orders",
      methods: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformQuery(listCustomOrdersSchema, {
          defaults: [],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/store/custom-orders",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(createCustomOrderSchema),
      ],
    },
    {
      matcher: "/store/custom-orders/*",
      methods: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/custom-orders/*/attachments",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(uploadCustomOrderAttachmentsSchema),
      ],
    },
    {
      matcher: "/admin/custom-orders",
      methods: ["GET"],
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        validateAndTransformQuery(listCustomOrdersSchema, {
          defaults: [],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/custom-orders/*",
      methods: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/custom-orders/*",
      methods: ["PATCH"],
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        validateAndTransformBody(updateCustomOrderSchema),
      ],
    },
  ],
})
