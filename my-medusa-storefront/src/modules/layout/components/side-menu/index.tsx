"use client"

import { Fragment } from "react"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { Text, clx, useToggleState } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"

import { Locale } from "@lib/data/locales"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"

const featuredLinks = [
  { title: "Bestsellers", href: "/store" },
  { title: "New Arrivals", href: "/store" },
  { title: "Gift Sets", href: "/store" },
]

const promotionLinks = [
  { title: "New Arrivals", href: "/store" },
  { title: "Gift Sets", href: "/store" },
  { title: "Special Offers", href: "/store" },
  { title: "View All Deals", href: "/store" },
]

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories: HttpTypes.StoreProductCategory[] | null
  collections: HttpTypes.StoreCollection[] | null
}

const SideMenu = ({
  regions,
  locales,
  currentLocale,
  categories,
  collections,
}: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  const topLevelCategories =
    categories?.filter((category) => !category.parent_category).slice(0, 6) || []
  const featuredCollections = collections?.slice(0, 6) || []

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative h-full inline-flex items-center gap-2 transition-colors duration-150 focus:outline-none hover:text-ui-fg-base cursor-pointer"
                >
                  <ChevronDown size="18" />
                  Menu
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-[#1A1A1A]/35 backdrop-blur-[2px] pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 scale-[0.99]"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-[0.99]"
              >
                <PopoverPanel className="fixed inset-0 z-[51] p-4 sm:p-6 text-sm text-ui-fg-base">
                  <div
                    data-testid="nav-menu-popup"
                    className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-[rgba(166,156,140,0.22)] bg-[#f7f3ec] shadow-[0_24px_60px_rgba(26,26,26,0.28)]"
                  >
                    <div className="flex items-center justify-between border-b border-[rgba(166,156,140,0.18)] px-5 py-4 sm:px-8 sm:py-5">
                      <div className="flex items-center gap-6 text-[0.72rem] uppercase tracking-[0.14em] text-ui-fg-muted">
                        <LocalizedClientLink href="/store" onClick={close}>
                          Shop
                        </LocalizedClientLink>
                        <LocalizedClientLink href="/store" onClick={close}>
                          All Products
                        </LocalizedClientLink>
                        <LocalizedClientLink href="/store" onClick={close}>
                          Explore
                        </LocalizedClientLink>
                      </div>
                      <div className="flex items-center gap-4">
                        <LocalizedClientLink
                          href="/cart"
                          onClick={close}
                          className="text-[0.72rem] uppercase tracking-[0.14em] text-ui-fg-muted"
                        >
                          Bag (0)
                        </LocalizedClientLink>
                        <button
                          data-testid="close-menu-button"
                          onClick={close}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(166,156,140,0.24)] bg-white transition-transform duration-150 hover:scale-105"
                        >
                          <XMark />
                        </button>
                      </div>
                    </div>

                    <div className="grid flex-1 gap-8 overflow-y-auto px-5 py-6 sm:px-8 lg:grid-cols-[1.15fr_1fr_1fr_0.95fr] lg:gap-10 lg:py-8">
                      <div className="flex flex-col justify-between gap-8 lg:min-h-0">
                        <div>
                          <p className="mb-4 text-[0.72rem] uppercase tracking-[0.18em] text-ui-fg-muted">
                            Featured
                          </p>
                          <ul className="flex flex-col gap-3">
                            {featuredLinks.map((item) => (
                              <li key={item.title}>
                                <LocalizedClientLink
                                  href={item.href}
                                  className="text-[1.5rem] leading-[1.05] text-[#1A1A1A] transition-colors duration-150 hover:text-ui-fg-interactive"
                                  onClick={close}
                                >
                                  {item.title}
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-[24px] border border-[rgba(166,156,140,0.18)] bg-[linear-gradient(135deg,rgba(224,122,95,0.12),rgba(44,110,73,0.08))] p-5 sm:p-6">
                          <p className="text-[0.72rem] uppercase tracking-[0.18em] text-ui-fg-muted">
                            Promotion
                          </p>
                          <h3 className="mt-2 text-[1.7rem] leading-tight text-[#1A1A1A]">
                            Fresh arrivals and gift-ready sets.
                          </h3>
                          <LocalizedClientLink
                            href="/store"
                            onClick={close}
                            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1A1A1A] px-4 py-2 text-[0.76rem] uppercase tracking-[0.12em] text-[#1A1A1A] transition-transform duration-150 hover:translate-x-1"
                          >
                            Shop now
                          </LocalizedClientLink>
                        </div>
                      </div>

                      <div>
                        <p className="mb-4 text-[0.72rem] uppercase tracking-[0.18em] text-ui-fg-muted">
                          Categories
                        </p>
                        <ul className="space-y-3">
                          {topLevelCategories.map((category) => {
                            const childCategories =
                              category.category_children?.slice(0, 4) || []

                            return (
                              <li
                                key={category.id}
                                className="border-b border-[rgba(166,156,140,0.12)] pb-3 last:border-b-0"
                              >
                                <LocalizedClientLink
                                  href={`/categories/${category.handle}`}
                                  onClick={close}
                                  className="text-[1.1rem] font-medium text-[#1A1A1A] transition-colors duration-150 hover:text-ui-fg-interactive"
                                >
                                  {category.name}
                                </LocalizedClientLink>
                                {childCategories.length > 0 && (
                                  <ul className="mt-2 space-y-1 pl-2 text-[0.82rem] text-ui-fg-muted">
                                    {childCategories.map((child) => (
                                      <li key={child.id}>
                                        <LocalizedClientLink
                                          href={`/categories/${child.handle}`}
                                          onClick={close}
                                          className="transition-colors duration-150 hover:text-ui-fg-base"
                                        >
                                          {child.name}
                                        </LocalizedClientLink>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-4 text-[0.72rem] uppercase tracking-[0.18em] text-ui-fg-muted">
                          Collections
                        </p>
                        <ul className="space-y-3">
                          {featuredCollections.map((collection) => (
                            <li key={collection.id}>
                              <LocalizedClientLink
                                href={`/collections/${collection.handle}`}
                                onClick={close}
                                className="text-[1.05rem] text-[#1A1A1A] transition-colors duration-150 hover:text-ui-fg-interactive"
                              >
                                {collection.title}
                              </LocalizedClientLink>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-4 text-[0.72rem] uppercase tracking-[0.18em] text-ui-fg-muted">
                          Promotions
                        </p>
                        <ul className="space-y-3">
                          {promotionLinks.map((item) => (
                            <li key={item.title}>
                              <LocalizedClientLink
                                href={item.href}
                                onClick={close}
                                className="text-[1.05rem] text-[#1A1A1A] transition-colors duration-150 hover:text-ui-fg-interactive"
                              >
                                {item.title}
                              </LocalizedClientLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-[rgba(166,156,140,0.18)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                        {!!locales?.length && (
                          <div
                            className="flex items-center justify-between gap-3"
                            onMouseEnter={languageToggleState.open}
                            onMouseLeave={languageToggleState.close}
                          >
                            <LanguageSelect
                              toggleState={languageToggleState}
                              locales={locales}
                              currentLocale={currentLocale}
                            />
                            <ArrowRightMini
                              className={clx(
                                "transition-transform duration-150",
                                languageToggleState.state ? "-rotate-90" : ""
                              )}
                            />
                          </div>
                        )}
                        <div
                          className="flex items-center justify-between gap-3"
                          onMouseEnter={countryToggleState.open}
                          onMouseLeave={countryToggleState.close}
                        >
                          {regions && (
                            <CountrySelect
                              toggleState={countryToggleState}
                              regions={regions}
                            />
                          )}
                          <ArrowRightMini
                            className={clx(
                              "transition-transform duration-150",
                              countryToggleState.state ? "-rotate-90" : ""
                            )}
                          />
                        </div>
                      </div>
                      <Text className="txt-compact-small text-ui-fg-muted">
                        © {new Date().getFullYear()} thaiVai. All rights reserved.
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
