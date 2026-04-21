"use client"

import { addToCart } from "@lib/data/cart"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { type WheelEvent, useRef, useState } from "react"

type PreviewProductCarouselProps = {
  products: HttpTypes.StoreProduct[]
  countryCode: string
}

const imagePlaceholderClass =
  "w-full h-full min-h-[clamp(230px,30vw,420px)] border-[1.5px] border-dashed border-[rgba(11,79,63,0.42)] flex items-center justify-center text-center p-4 text-[rgba(11,79,63,0.82)] font-semibold uppercase tracking-[0.07em] text-[0.74rem] bg-[repeating-linear-gradient(-45deg,rgba(11,79,63,0.07)_0,rgba(11,79,63,0.07)_9px,rgba(255,255,255,0.34)_9px,rgba(255,255,255,0.34)_18px)]"

const PreviewProductCarousel = ({
  products,
  countryCode,
}: PreviewProductCarouselProps) => {
  const router = useRouter()
  const trackRef = useRef<HTMLDivElement>(null)
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null)

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!trackRef.current) {
      return
    }

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return
    }

    event.preventDefault()
    trackRef.current.scrollLeft += event.deltaY
  }

  const handleAddToCart = async (variantId?: string) => {
    if (!variantId) {
      return
    }

    setAddingVariantId(variantId)

    try {
      await addToCart({
        variantId,
        quantity: 1,
        countryCode,
      })

      router.refresh()
    } finally {
      setAddingVariantId(null)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border-[3px] border-[#0b4f3f] bg-[#f1d8d6] shadow-[0_20px_40px_rgba(19,39,68,0.18)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#f1d8d6] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#f1d8d6] to-transparent" />

      {products.length > 0 ? (
        <div className="border-b border-[#0b4f3f]/15 px-6 py-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#0b4f3f]">
          Scroll with the mouse wheel to browse all products
        </div>
      ) : null}

      <div
        ref={trackRef}
        onWheel={handleWheel}
        className="flex gap-6 overflow-x-auto px-8 py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x proximity" }}
      >
        {products.length > 0 ? (
          products.map((product, index) => {
            const imageUrl = product.thumbnail || product.images?.[0]?.url || ""
            const { cheapestPrice } = getProductPrice({ product })
            const primaryVariant =
              product.variants?.find(
                (variant) =>
                  !variant.manage_inventory ||
                  variant.allow_backorder ||
                  (variant.inventory_quantity ?? 0) > 0
              ) ?? product.variants?.[0]

            return (
              <article
                key={product.id}
                className="flex min-w-[min(78vw,330px)] max-w-[330px] shrink-0 snap-start flex-col rounded-[22px] border-[3px] border-[#0b4f3f] bg-[#f7f3ec] p-4 text-center shadow-[0_14px_28px_rgba(19,39,68,0.18)] transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_22px_44px_rgba(19,39,68,0.26)]"
                style={{ animation: `bounce-in 0.8s ease-out ${0.15 + (index % 4) * 0.08}s forwards` }}
              >
                <LocalizedClientLink
                  href={`/products/${product.handle}`}
                  className="block"
                >
                  <div className="relative overflow-hidden rounded-[18px] border-[2px] border-[#0b4f3f] bg-[#fff9f3] shadow-[0_10px_22px_rgba(19,39,68,0.14)]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.title || "Inventory product"}
                        className="h-[clamp(180px,24vw,280px)] w-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    ) : (
                      <div
                        className={`${imagePlaceholderClass} min-h-[clamp(180px,24vw,280px)] border-0`}
                      >
                        Product image placeholder
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b4f3f]/20 to-transparent" />
                  </div>
                </LocalizedClientLink>

                <h3 className="m-[0.95rem_0_0.2rem] uppercase text-[0.92rem] tracking-[0.08em]">
                  {product.title}
                </h3>
                <p className="m-0 text-[0.72rem] tracking-[0.08em] uppercase text-[#4f5a58]">
                  {product.subtitle || product.handle || "Inventory item"}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(11,79,63,0.18)] bg-[#fff9f3] px-4 py-3 text-left">
                  <div>
                    <p className="m-0 text-[0.68rem] uppercase tracking-[0.12em] text-[#0b4f3f]">
                      {cheapestPrice ? "From" : "Price unavailable"}
                    </p>
                    <p className="m-0 text-[0.95rem] font-bold text-[#13211e]">
                      {cheapestPrice?.calculated_price || "See product"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!primaryVariant || addingVariantId === primaryVariant?.id}
                    isLoading={addingVariantId === primaryVariant?.id}
                    onClick={() => handleAddToCart(primaryVariant?.id)}
                    className="min-h-10 rounded-full px-4 text-[0.72rem] uppercase tracking-[0.08em]"
                  >
                    Add to cart
                  </Button>
                </div>
              </article>
            )
          })
        ) : (
          <article className="min-w-full rounded-[22px] border-[3px] border-[#0b4f3f] bg-[#f7f3ec] p-6 text-center shadow-[0_14px_28px_rgba(19,39,68,0.18)]">
            <div className={imagePlaceholderClass}>No inventory products available</div>
            <h3 className="m-[0.95rem_0_0.2rem] uppercase text-[0.92rem] tracking-[0.08em]">
              Add products in Medusa
            </h3>
            <p className="m-0 text-[0.72rem] tracking-[0.08em] uppercase text-[#4f5a58]">
              The carousel will populate automatically once inventory exists.
            </p>
          </article>
        )}
      </div>
    </div>
  )
}

export default PreviewProductCarousel