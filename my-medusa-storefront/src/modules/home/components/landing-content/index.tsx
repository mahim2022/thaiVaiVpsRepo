"use client"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useMemo, useState } from "react"

const spotlightSlides = [
  {
    title: "Thai Snacks Best-Sellers",
    subtitle:
      "Craving seaweed chips, spicy noodles, and tropical candy? Discover the most re-ordered treats across Bangladesh.",
    image: "/thai-snacks-spotlight.svg",
  },
  {
    title: "K-Beauty Meets Thai Skincare",
    subtitle:
      "Gentle cleansers, hydration packs, and glow serums sourced from trusted Thai brands at everyday prices.",
    image: "/thai-skincare-spotlight.svg",
  },
  {
    title: "Home and Lifestyle Picks",
    subtitle:
      "From kitchen tools to decor accents, import-ready essentials that fit modern Bangladesh households.",
    image: "/thai-home-spotlight.svg",
  },
]

const metrics = [
  { value: "15K+", label: "Orders in Bangladesh" },
  { value: "500+", label: "Thailand imports live" },
  { value: "4.8/5", label: "Customer rating" },
]

const shoppingPerks = [
  "Fresh stock updates every week",
  "Price drops on trending Thai products",
  "Customer support in Bangla and English",
  "Bundle deals for family shopping",
]

export default function LandingContent({
  carouselProducts,
}: {
  carouselProducts: HttpTypes.StoreProduct[]
}) {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % spotlightSlides.length)
    }, 4600)

    return () => clearInterval(timer)
  }, [])

  const active = useMemo(() => spotlightSlides[activeSlide], [activeSlide])

  return (
    <div className="content-container pb-12 small:pb-20">
      <section className="landing-promo-strip home-animate-zoom-in" aria-label="Promotions">
        <div className="landing-marquee-track">
          <span>Thailand imported goods now in Bangladesh</span>
          <span>New stock updates every week</span>
          <span>Exclusive thaiVai bundle deals live</span>
          <span>Thailand imported goods now in Bangladesh</span>
          <span>New stock updates every week</span>
          <span>Exclusive thaiVai bundle deals live</span>
        </div>
      </section>

      <section className="landing-spotlight-grid" aria-label="Spotlight collections">
        <article className="landing-spotlight-copy home-animate-slide-in-left">
          <p className="landing-kicker">Top Imported Categories</p>
          <h2>{active.title}</h2>
          <p>{active.subtitle}</p>
          <div className="landing-metric-row">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
          <div className="landing-dot-row" aria-hidden="true">
            {spotlightSlides.map((slide, index) => (
              <button
                key={slide.title}
                className={index === activeSlide ? "is-active" : ""}
                onClick={() => setActiveSlide(index)}
                type="button"
                aria-label={`Show slide ${index + 1}`}
              />
            ))}
          </div>

          <ul className="landing-perk-list" aria-label="Shopping perks">
            {shoppingPerks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        </article>

        <article className="landing-spotlight-image home-animate-slide-in-right">
          <img src={active.image} alt={active.title} loading="eager" />
        </article>
      </section>

      <section className="landing-image-carousel home-animate-zoom-in" aria-label="Lifestyle gallery">
        <div className="landing-image-track">
          {carouselProducts.length > 0 ? carouselProducts.concat(carouselProducts).map((product, index) => {
            const { cheapestPrice } = getProductPrice({ product })

            return (
              <LocalizedClientLink
                href={`/products/${product.handle}`}
                className="landing-image-card"
                key={`${product.id}-${index}`}
              >
                <img
                  src={product.thumbnail || "/thai-snacks-card.svg"}
                  alt={product.title}
                  loading="lazy"
                />
                <div>
                  <p className="landing-product-tag">Thailand import</p>
                  <h3>{product.title}</h3>
                  <p>
                    {product.subtitle || product.collection?.title || "Popular imported item in Bangladesh"}
                  </p>
                  <strong className="landing-product-price">
                    {cheapestPrice?.calculated_price || "See price"}
                  </strong>
                </div>
              </LocalizedClientLink>
            )
          }) : (
            <article className="landing-carousel-empty">
              <h3>Thailand products are loading</h3>
              <p>Once catalog items are available, this carousel will highlight real imports you can order in Bangladesh.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}
