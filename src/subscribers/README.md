# Custom subscribers

Subscribers handle events emitted in the Medusa application.

> Learn more about Subscribers in [this documentation](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers).

The subscriber is created in a TypeScript or JavaScript file under the `src/subscribers` directory.

For example, create the file `src/subscribers/product-created.ts` with the following content:

```ts
import {
  type SubscriberConfig,
} from "@medusajs/framework"

// subscriber function
export default async function productCreateHandler() {
  console.log("A product was created")
}

// subscriber config
export const config: SubscriberConfig = {
  event: "product.created",
}
```

## Brevo Transactional Emails

This project includes Brevo transactional email subscribers:

- `customer.created` -> welcome email
- `order.placed` -> order confirmation email
- `shipment.created` -> shipped email
- `order.canceled` -> canceled email
- `auth.password_reset` -> password reset email

Required environment variables:

- `BREVO_ENABLED`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `BREVO_SANDBOX_MODE`
- `BREVO_TIMEOUT_MS`
- `BREVO_TEMPLATE_ID_CUSTOMER_WELCOME`
- `BREVO_TEMPLATE_ID_ORDER_PLACED`
- `BREVO_TEMPLATE_ID_ORDER_SHIPPED`
- `BREVO_TEMPLATE_ID_ORDER_CANCELED`
- `BREVO_TEMPLATE_ID_AUTH_PASSWORD_RESET`

Template IDs are configured in `.env.template` and `.env`. Keep these synced with your Brevo template IDs.

A subscriber file must export:

- The subscriber function that is an asynchronous function executed whenever the associated event is triggered.
- A configuration object defining the event this subscriber is listening to.

## Subscriber Parameters

A subscriber receives an object having the following properties:

- `event`: An object holding the event's details. It has a `data` property, which is the event's data payload.
- `container`: The Medusa container. Use it to resolve modules' main services and other registered resources.

```ts
import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

export default async function productCreateHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id

  const productModuleService = container.resolve("product")

  const product = await productModuleService.retrieveProduct(productId)

  console.log(`The product ${product.title} was created`)
}

export const config: SubscriberConfig = {
  event: "product.created",
}
```