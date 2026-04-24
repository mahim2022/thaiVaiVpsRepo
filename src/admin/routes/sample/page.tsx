import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"

const SampleAdminPage = () => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Sample Admin Page</Heading>
      </div>
      <div className="px-6 py-4">
        <p>
          This is a simple custom Medusa Admin UI route. If you can open this
          page after logging in, the admin route extension is working.
        </p>
        <p className="mt-3 text-sm text-ui-fg-subtle">
          Path: /app/sample
        </p>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Sample Page",
})

export const handle = {
  breadcrumb: () => "Sample Page",
}

export default SampleAdminPage
