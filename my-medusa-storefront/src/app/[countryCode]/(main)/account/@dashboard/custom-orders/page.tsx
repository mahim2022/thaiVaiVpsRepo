import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listCustomOrders } from "@lib/data/custom-orders"
import { retrieveCustomer } from "@lib/data/customer"
import CustomOrders from "@modules/account/components/custom-orders"

export const metadata: Metadata = {
  title: "Custom Orders",
  description: "Submit and track custom order requests.",
}

export default async function CustomOrdersPage() {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    notFound()
  }

  const orders = (await listCustomOrders().catch(() => [])) || []

  return <CustomOrders orders={orders} />
}
