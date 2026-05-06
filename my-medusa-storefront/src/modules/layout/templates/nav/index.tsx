import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import UserIcon from "@modules/common/icons/user"
import BrandMark from "@modules/layout/components/brand-mark"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-32 mx-auto border-b-2 duration-200 border-ui-border-base shadow-[0_10px_20px_rgba(19,39,68,0.14)]">
        <nav className="content-container txt-xsmall-plus text-ui-fg-base flex items-center justify-between w-full h-full text-base">
          <div className="flex-1 basis-0 h-full flex items-center">
            <div className="h-full">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="inline-flex items-center cursor-pointer transition-colors duration-150 hover:text-ui-fg-accent"
              data-testid="nav-store-link"
            >
              <BrandMark priority width={240} height={240} imageClassName="h-60 w-60" />
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="inline-flex items-center gap-2 text-base cursor-pointer transition-colors duration-150 hover:text-ui-fg-accent"
                href="/account"
                data-testid="nav-account-link"
              >
                <UserIcon size="18" />
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-white flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
