import { retrieveCustomer } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function CustomOrderButton() {
  const customer = await retrieveCustomer().catch(() => null)
  const href = customer ? "/account/custom-orders" : "/account"

  return (
    <LocalizedClientLink
      href={href}
      className="self-start border border-[#0b4f3f] py-[0.64rem] px-[1.1rem] rounded-full no-underline uppercase tracking-[0.08em] text-[0.74rem] font-bold transition-all duration-150 ease-in bg-white text-[#0b4f3f] hover:-translate-y-px hover:scale-110 active:scale-95"
      style={{ animation: "bounce-in 1s ease-out 0.5s forwards" }}
    >
      Custom Order
    </LocalizedClientLink>
  )
}
