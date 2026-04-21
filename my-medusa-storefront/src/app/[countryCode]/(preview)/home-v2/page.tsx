import { Metadata } from "next"
import Link from "next/link"

import { getHomeV2Media } from "@lib/data/home-v2-media"
import { listProducts } from "@lib/data/products"
import PreviewProductCarousel from "./product-carousel"

export const metadata: Metadata = {
  title: "Thai Vai Preview",
  description: "Static visual replica page with placeholder image slots.",
}

export const dynamic = "force-dynamic"

const testimonialItems = [
  {
    title: "Smooth International Delivery",
    body: "Orders arrived safely and all items were packed carefully. Great first experience.",
  },
  {
    title: "Authentic Taste",
    body: "The flavor profile feels exactly like what I buy in Thailand. Will order again.",
  },
  {
    title: "Reliable Quality",
    body: "Consistent product quality and a simple checkout made this easy for our family.",
  },
]

const SECOND_SECTION_BG_IMAGE = "/images/section-two-background.png"
const THIRD_SECTION_BG_IMAGE = "/images/section-three-background.png"
const FIRST_HERO_BG_IMAGE = "/images/home-v2/hero-bg.png"

export default async function ThaiVibePreviewPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  const allProducts: Awaited<ReturnType<typeof listProducts>>["response"]["products"] = []
  let pageParam = 1

  while (true) {
    const {
      response: { products },
      nextPage,
    } = await listProducts({
      countryCode,
      pageParam,
      queryParams: {
        limit: 100,
      },
    })

    allProducts.push(...products)

    if (!nextPage) {
      break
    }

    pageParam = nextPage
  }

  const homeV2Media = await getHomeV2Media(countryCode)

  const dividerClass = "border-t-[80px] border-[#0b4f3f] max-[980px]:border-t-[56px]"
  const imagePlaceholderClass =
    "w-full h-full min-h-[clamp(230px,30vw,420px)] border-[1.5px] border-dashed border-[rgba(11,79,63,0.42)] flex items-center justify-center text-center p-4 text-[rgba(11,79,63,0.82)] font-semibold uppercase tracking-[0.07em] text-[0.74rem] bg-[repeating-linear-gradient(-45deg,rgba(11,79,63,0.07)_0,rgba(11,79,63,0.07)_9px,rgba(255,255,255,0.34)_9px,rgba(255,255,255,0.34)_18px)]"
  const heroCollageItems = homeV2Media.heroCollage.slice(0, 4)
  const hasThreeHeroImages = heroCollageItems.length === 3

  return (
    <div className="w-screen ml-[calc(50%-50vw)] text-[#13211e]">
      <section
        className="grid overflow-hidden min-h-[clamp(380px,50vw,620px)] grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] max-[980px]:grid-cols-1 max-[980px]:min-h-0"
        style={{ animation: "fade-in-up 0.9s ease-out forwards" }}
      >
        <div 
          className="bg-[#f1d8d6] p-[clamp(1.4rem,3.8vw,4.8rem)] flex flex-col justify-center gap-[0.9rem]"
          style={{ animation: "slide-left 1s ease-out forwards" }}
        >
          <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] text-[#0b4f3f] font-bold" style={{ animation: "fade-in-up 1.2s ease-out 0.1s forwards" }}>
            Thai Vai
          </p>
          <h1 style={{ animation: "fade-in-up 1.2s ease-out 0.2s forwards" }}>Best Imported Products From Thailand</h1>
          <p className="m-0 text-[#4f5a58] max-w-[58ch]" style={{ animation: "fade-in-up 1.2s ease-out 0.3s forwards" }}>
            A visual-first landing page replica with image placeholders that can be swapped
            with your final product photography later.
          </p>
          <Link
            href="#catalog"
            className="self-start border border-[#0b4f3f] py-[0.64rem] px-[1.1rem] rounded-full no-underline uppercase tracking-[0.08em] text-[0.74rem] font-bold transition-all duration-150 ease-in bg-[#0b4f3f] text-[#f7f3ec] hover:-translate-y-px hover:scale-110 active:scale-95"
            style={{ animation: "bounce-in 1s ease-out 0.4s forwards" }}
          >
            Browse Products
          </Link>
        </div>
        <div
          className="relative flex items-center justify-center overflow-hidden bg-[#f1d8d6] p-[clamp(1rem,2.2vw,2rem)]"
          style={{
            animation: "slide-right 1s ease-out forwards",
            backgroundImage: `linear-gradient(rgba(241, 216, 214, 0.36), rgba(241, 216, 214, 0.36)), url('${FIRST_HERO_BG_IMAGE}')`,
            backgroundPosition: "center",
            backgroundSize: "92% auto",
            backgroundRepeat: "no-repeat",
          }}
        >
          {heroCollageItems.length > 0 ? (
            <div
              className="mx-auto grid w-[92%] max-w-[560px] min-h-[clamp(240px,34vw,460px)] grid-cols-2 gap-4 max-[980px]:min-h-[210px]"
              style={{ animation: "fade-in-down 1.2s ease-out 0.2s forwards, float-up 4s ease-in-out 1.2s infinite" }}
            >
              {heroCollageItems.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className={`relative overflow-hidden rounded-[12px] transition-transform duration-500 ${hasThreeHeroImages && index === 2 ? "col-span-2 w-[48%] justify-self-center" : ""}`}
                  style={
                    (heroCollageItems.length === 2 || (hasThreeHeroImages && index < 2))
                      ? { transform: `rotate(${index % 2 === 0 ? -5 : 5}deg)` }
                      : undefined
                  }
                >
                  <img
                    src={item.url}
                    alt={item.alt}
                    className="h-[clamp(130px,18vw,220px)] w-full object-contain transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`${imagePlaceholderClass} min-h-[clamp(280px,38vw,520px)] max-[980px]:min-h-[220px]`}
              style={{ animation: "fade-in-down 1.2s ease-out 0.2s forwards, float-up 4s ease-in-out 1.2s infinite" }}
            >
              Hero collage image placeholder
            </div>
          )}
        </div>
      </section>

      <section
        id="catalog"
        className={`${dividerClass} bg-[#f7f3ec] px-[clamp(0.9rem,2.4vw,1.6rem)] pb-[clamp(0.9rem,2.4vw,1.6rem)] pt-[clamp(0.45rem,1.2vw,0.8rem)] overflow-hidden`}
        style={{ animation: "fade-in-up 1s ease-out 0.3s forwards" }}
      >
        <PreviewProductCarousel products={allProducts} countryCode={countryCode} />
      </section>

      <section
        className={`${dividerClass} grid overflow-hidden min-h-[clamp(380px,50vw,620px)] grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] max-[980px]:grid-cols-1 max-[980px]:min-h-0`}
        style={{ animation: "fade-in-up 1s ease-out 0.6s forwards" }}
      >
        <div
          className="relative overflow-hidden bg-[#d8e6ed] flex items-center justify-center p-[clamp(1rem,2.2vw,2rem)] max-[980px]:order-[-1]"
          style={{
            animation: "slide-left 1s ease-out 0.65s forwards",
            backgroundImage: `url('${SECOND_SECTION_BG_IMAGE}')`,
            backgroundPosition: "center",
            backgroundSize: "92% auto",
            backgroundRepeat: "no-repeat",
          }}
        >
          {homeV2Media.sourcingImage ? (
            <img
              src={homeV2Media.sourcingImage.url}
              alt={homeV2Media.sourcingImage.alt}
              className="relative z-10 mx-auto h-[clamp(190px,24vw,320px)] w-[min(82%,520px)] object-contain max-[980px]:h-[200px] max-[980px]:w-[min(88%,420px)]"
              style={{ animation: "float-up 4s ease-in-out 0.7s infinite" }}
            />
          ) : (
            <div className={`${imagePlaceholderClass} relative z-10 max-[980px]:min-h-[220px]`} style={{ animation: "float-up 4s ease-in-out 0.7s infinite" }}>
              Sourcing image placeholder
            </div>
          )}
        </div>
        <div className="bg-[#f1d8d6] p-[clamp(1.4rem,3.8vw,4.8rem)] flex flex-col justify-center gap-[0.9rem]" style={{ animation: "slide-right 1s ease-out 0.65s forwards" }}>
          <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] text-[#0b4f3f] font-bold" style={{ animation: "fade-in-left 1s ease-out 0.7s forwards" }}>
            Sourcing
          </p>
          <h2 style={{ animation: "fade-in-left 1s ease-out 0.8s forwards" }}>Direct Imports With Full Traceability</h2>
          <p className="m-0 text-[#4f5a58] max-w-[58ch]" style={{ animation: "fade-in-left 1s ease-out 0.9s forwards" }}>
            We work with vetted suppliers and keep every batch documented so quality remains
            consistent from warehouse to doorstep.
          </p>
        </div>
      </section>

      <section
        className={`${dividerClass} grid overflow-hidden min-h-[clamp(380px,50vw,620px)] grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] max-[980px]:grid-cols-1 max-[980px]:min-h-0`}
        style={{ animation: "fade-in-up 1s ease-out 0.9s forwards" }}
      >
        <div className="bg-[#f1d8d6] p-[clamp(1.4rem,3.8vw,4.8rem)] flex flex-col justify-center gap-[0.9rem]" style={{ animation: "slide-left 1s ease-out 0.95s forwards" }}>
          <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] text-[#0b4f3f] font-bold" style={{ animation: "heartbeat 1.2s ease-in-out 1s infinite" }}>
            Save 5%
          </p>
          <h2 style={{ animation: "fade-in-right 1s ease-out 1.05s forwards" }}>Join for Weekly Offers</h2>
          <p className="m-0 text-[#4f5a58] max-w-[58ch]" style={{ animation: "fade-in-right 1s ease-out 1.1s forwards" }}>
            Subscribe for price drops, fresh arrivals, and bundle deals curated for Thai product lovers.
          </p>
          <form className="mt-[0.3rem] grid gap-[0.45rem]">
            <label
              htmlFor="email"
              className="text-[0.72rem] uppercase tracking-[0.1em] text-[#0b4f3f] font-bold"
              style={{ animation: "fade-in-down 1s ease-out 1.1s forwards" }}
            >
              Email Address
            </label>
            <div className="flex gap-2 items-stretch flex-wrap" style={{ animation: "fade-in-up 1s ease-out 1.15s forwards" }}>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="flex-[1_1_220px] min-h-[42px] border border-[rgba(11,79,63,0.24)] bg-[#fff9f3] rounded-none px-[0.8rem] py-[0.6rem] transition-all duration-300 hover:border-[#0b4f3f] focus:scale-105"
              />
              <button
                type="submit"
                className="border border-[#0b4f3f] rounded-none min-h-[42px] px-4 bg-[#0b4f3f] text-[#f7f3ec] uppercase tracking-[0.08em] font-bold text-[0.72rem] transition-all duration-300 hover:scale-110 active:scale-95"
              >
                Subscribe
              </button>
            </div>
          </form>
        </div>
        <div
          className="bg-[#f7f3ec] flex items-center justify-center p-[clamp(1rem,2.2vw,2rem)] max-[980px]:order-[-1]"
          style={{ animation: "slide-right 1s ease-out 0.95s forwards" }}
        >
          <div
            className="w-full min-h-[clamp(230px,30vw,420px)] rounded-[18px] bg-[#fff9f3] shadow-[0_14px_28px_rgba(19,39,68,0.16)] max-[980px]:min-h-[220px]"
            style={{
              animation: "jello 1s ease-in-out 1s, float-up 4s ease-in-out 2.5s infinite",
              backgroundImage: `url('${THIRD_SECTION_BG_IMAGE}')`,
              backgroundPosition: "center",
              backgroundSize: "108% auto",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      </section>

      <section
        className={`${dividerClass} bg-[#f7f3ec] py-[1.6rem] px-[clamp(1rem,3.6vw,3rem)]`}
        style={{ animation: "fade-in-up 1s ease-out 1.2s forwards" }}
      >
        <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] text-[#0b4f3f] font-bold" style={{ animation: "fade-in-down 1s ease-out 1.25s forwards" }}>
          Testimonials
        </p>
        <div className="grid grid-cols-3 gap-[clamp(0.75rem,1.7vw,1.2rem)] max-[980px]:grid-cols-1">
          {testimonialItems.map((item, index) => (
            <article 
              key={item.title} 
              className="bg-[#fdfaf6] border border-[rgba(11,79,63,0.24)] p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-[#0b4f3f] cursor-pointer"
              style={{ animation: `slide-up 0.8s ease-out ${1.3 + index * 0.1}s forwards` }}
            >
              <h3 className="m-[0_0_0.4rem] uppercase text-[0.84rem] tracking-[0.08em]" style={{ animation: `fade-in-left 0.8s ease-out ${1.35 + index * 0.1}s forwards` }}>
                {item.title}
              </h3>
              <p className="m-0 text-[#4f5a58] text-[0.88rem]" style={{ animation: `fade-in-left 0.8s ease-out ${1.4 + index * 0.1}s forwards` }}>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={`${dividerClass} grid overflow-hidden min-h-[clamp(380px,50vw,620px)] grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] max-[980px]:grid-cols-1 max-[980px]:min-h-0`}
        style={{ animation: "fade-in-up 1s ease-out 1.5s forwards" }}
      >
        <div className="bg-[#f7f3ec] flex items-center justify-center p-[clamp(1rem,2.2vw,2rem)]" style={{ animation: "slide-left 1s ease-out 1.55s forwards" }}>
          {homeV2Media.campaignCollage.length > 0 ? (
            <div
              className="grid w-full min-h-[clamp(280px,38vw,520px)] grid-cols-2 gap-2 overflow-hidden rounded-[18px] border-2 border-[#0b4f3f] bg-[#fff9f3] p-2 shadow-[0_14px_28px_rgba(19,39,68,0.16)] max-[980px]:min-h-[220px]"
              style={{ animation: "fade-in-down 1s ease-out 1.6s forwards, pulse-glow 3s ease-in-out 1.6s infinite" }}
            >
              {homeV2Media.campaignCollage.slice(0, 4).map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="relative overflow-hidden rounded-[12px] border border-[rgba(11,79,63,0.28)]"
                >
                  <img
                    src={item.url}
                    alt={item.alt}
                    className="h-full min-h-[120px] w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`${imagePlaceholderClass} min-h-[clamp(280px,38vw,520px)] max-[980px]:min-h-[220px]`}
              style={{ animation: "fade-in-down 1s ease-out 1.6s forwards, pulse-glow 3s ease-in-out 1.6s infinite" }}
            >
              Campaign collage placeholder
            </div>
          )}
        </div>
        <div className="bg-[#f1d8d6] p-[clamp(1.4rem,3.8vw,4.8rem)] flex flex-col justify-center gap-[0.9rem]" style={{ animation: "slide-right 1s ease-out 1.55s forwards" }}>
          <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] text-[#0b4f3f] font-bold" style={{ animation: "fade-in-right 1s ease-out 1.6s forwards" }}>
            Be in the Know
          </p>
          <h2 style={{ animation: "fade-in-right 1s ease-out 1.7s forwards" }}>New Drops Every Week</h2>
          <p className="m-0 text-[#4f5a58] max-w-[58ch]" style={{ animation: "fade-in-right 1s ease-out 1.8s forwards" }}>
            Turn on updates and stay ahead of limited Thai imports and restocks.
          </p>
          <Link
            href="/store"
            className="self-start border border-[#0b4f3f] py-[0.64rem] px-[1.1rem] rounded-full no-underline uppercase tracking-[0.08em] text-[0.74rem] font-bold transition-all duration-300 ease-in bg-transparent text-[#0b4f3f] hover:-translate-y-px hover:bg-[#0b4f3f] hover:text-[#f7f3ec] hover:scale-110 active:scale-95"
            style={{ animation: "bounce-in 1s ease-out 1.9s forwards" }}
          >
            Visit Store
          </Link>
        </div>
      </section>
    </div>
  )
}
