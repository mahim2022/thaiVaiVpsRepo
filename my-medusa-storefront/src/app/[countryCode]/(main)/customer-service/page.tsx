import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Customer Service",
  description: "Support information and frequently asked questions.",
}

export default function CustomerServicePage() {
  return (
    <div className="content-container py-12" data-testid="customer-service-page">
      <div className="mx-auto max-w-3xl rounded-lg border border-ui-border-base bg-white p-6">
        <h1 className="text-2xl-semi mb-4">Customer Service</h1>
        <p className="text-base-regular text-ui-fg-subtle mb-6">
          Need help with an order, shipping, returns, or a custom request? Use the
          guidance below and contact our team if you need direct support.
        </p>

        <div className="flex flex-col gap-5">
          <section>
            <h2 className="text-large-semi mb-2">Order Support</h2>
            <p className="text-base-regular text-ui-fg-subtle">
              For regular orders, visit your account orders page to track status and
              delivery progress.
            </p>
          </section>

          <section>
            <h2 className="text-large-semi mb-2">Custom Orders</h2>
            <p className="text-base-regular text-ui-fg-subtle">
              For custom requests, use your account custom orders page. Upload images,
              add notes, and check admin replies there.
            </p>
          </section>

          <section>
            <h2 className="text-large-semi mb-2">Contact</h2>
            <p className="text-base-regular text-ui-fg-subtle">
              Email: support@summithire.tech
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
