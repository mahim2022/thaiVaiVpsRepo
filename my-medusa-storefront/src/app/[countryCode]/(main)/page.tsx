import { Metadata } from "next"

import { listProducts } from "@lib/data/products"
import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import LandingContent from "@modules/home/components/landing-content"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "thaiVai",
  description:
    "Shop authentic Thailand imported products in Bangladesh.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const [{ collections }, { response }] = await Promise.all([
    listCollections({
      fields: "id, handle, title",
    }),
    listProducts({
      countryCode,
      queryParams: {
        limit: 8,
      },
    }),
  ])

  const carouselProducts = response.products.slice(0, 8)

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero />
      <LandingContent carouselProducts={carouselProducts} />
      <section className="content-container pt-4 small:pt-6">
        <div className="home-products-intro home-animate-slide-in-left">
          <p>Best sellers for Bangladesh shoppers</p>
          <h2>Top Thailand Imports You Can Order Today</h2>
        </div>
      </section>
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
