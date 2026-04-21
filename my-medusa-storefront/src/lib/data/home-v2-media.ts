"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getRegion } from "./regions"

const HERO_COLLAGE_HANDLE = "home-v2-hero-collage"
const SOURCING_HANDLE = "home-v2-sourcing"
const PROMO_HANDLE = "home-v2-promo"
const CAMPAIGN_COLLAGE_HANDLE = "home-v2-campaign-collage"

type HomeV2Image = {
  url: string
  alt: string
  title?: string
  handle?: string
}

export type HomeV2Media = {
  heroCollage: HomeV2Image[]
  sourcingImage?: HomeV2Image
  promoIllustration?: HomeV2Image
  campaignCollage: HomeV2Image[]
}

const getCollectionByHandle = async (handle: string) => {
  const { collections } = await sdk.client.fetch<{
    collections: Array<{ id: string; handle: string; title?: string | null }>
  }>("/store/collections", {
    method: "GET",
    query: {
      handle,
      limit: 1,
      fields: "id,handle,title",
    },
    next: { revalidate: 120 },
    cache: "force-cache",
  })

  return collections?.[0]
}

const getCollectionProducts = async ({
  countryCode,
  collectionId,
  limit,
}: {
  countryCode: string
  collectionId: string
  limit: number
}) => {
  const region = await getRegion(countryCode)

  if (!region?.id) {
    return [] as HttpTypes.StoreProduct[]
  }

  const { products } = await sdk.client.fetch<{
    products: HttpTypes.StoreProduct[]
  }>("/store/products", {
    method: "GET",
    query: {
      region_id: region.id,
      collection_id: collectionId,
      limit,
      fields: "id,title,handle,thumbnail,images.url",
    },
    next: { revalidate: 120 },
    cache: "force-cache",
  })

  return products || []
}

const mapProductToImage = (
  product?: HttpTypes.StoreProduct
): HomeV2Image | undefined => {
  if (!product) {
    return undefined
  }

  const url = product.thumbnail || product.images?.[0]?.url

  if (!url) {
    return undefined
  }

  return {
    url,
    alt: product.title || "Product image",
    title: product.title,
    handle: product.handle,
  }
}

export const getHomeV2Media = async (
  countryCode: string
): Promise<HomeV2Media> => {
  try {
    const [heroCollection, sourcingCollection, promoCollection, campaignCollection] =
      await Promise.all([
        getCollectionByHandle(HERO_COLLAGE_HANDLE),
        getCollectionByHandle(SOURCING_HANDLE),
        getCollectionByHandle(PROMO_HANDLE),
        getCollectionByHandle(CAMPAIGN_COLLAGE_HANDLE),
      ])

    const [heroProducts, sourcingProducts, promoProducts, campaignProducts] = await Promise.all([
      heroCollection?.id
        ? getCollectionProducts({
            countryCode,
            collectionId: heroCollection.id,
            limit: 8,
          })
        : Promise.resolve([]),
      sourcingCollection?.id
        ? getCollectionProducts({
            countryCode,
            collectionId: sourcingCollection.id,
            limit: 1,
          })
        : Promise.resolve([]),
      promoCollection?.id
        ? getCollectionProducts({
            countryCode,
            collectionId: promoCollection.id,
            limit: 1,
          })
        : Promise.resolve([]),
      campaignCollection?.id
        ? getCollectionProducts({
            countryCode,
            collectionId: campaignCollection.id,
            limit: 8,
          })
        : Promise.resolve([]),
    ])

    return {
      heroCollage: heroProducts
        .map((product) => mapProductToImage(product))
        .filter((item): item is HomeV2Image => Boolean(item)),
      sourcingImage: mapProductToImage(sourcingProducts[0]),
      promoIllustration: mapProductToImage(promoProducts[0]),
      campaignCollage: campaignProducts
        .map((product) => mapProductToImage(product))
        .filter((item): item is HomeV2Image => Boolean(item)),
    }
  } catch {
    return {
      heroCollage: [],
      campaignCollage: [],
    }
  }
}
