import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

// In-memory cache (Note: may not persist across Edge invocations)
let regionMapCache: Map<string, HttpTypes.StoreRegion> | null = null
let cacheTime = 0

async function getRegions(): Promise<HttpTypes.StoreRegion[]> {
  try {
    if (!BACKEND_URL || !PUBLISHABLE_API_KEY) {
      return []
    }

    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.regions || []
  } catch (error) {
    return []
  }
}

async function getRegionMap(): Promise<Map<string, HttpTypes.StoreRegion>> {
  // Return cached if valid
  if (regionMapCache && Date.now() - cacheTime < 3600000) {
    return regionMapCache
  }

  const regions = await getRegions()
  const map = new Map<string, HttpTypes.StoreRegion>()

  regions.forEach((region: HttpTypes.StoreRegion) => {
    region.countries?.forEach((c) => {
      map.set(c.iso_2 ?? "", region)
    })
  })

  if (map.size > 0) {
    regionMapCache = map
    cacheTime = Date.now()
  }

  return map
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip static assets
  if (pathname.match(/\.(js|css|png|jpg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/)) {
    return NextResponse.next()
  }

  // Check if path already has country code
  const pathParts = pathname.split("/").filter(Boolean)
  const urlCountryCode = pathParts[0]?.toLowerCase()

  // Get available regions
  const regionMap = await getRegionMap()

  // If URL already has a valid country code, allow it
  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    const response = NextResponse.next()
    response.headers.set("x-country-code", urlCountryCode)
    return response
  }

  // Get or create cache ID
  let cacheIdCookie = request.cookies.get("_medusa_cache_id")
  let cacheId = cacheIdCookie?.value || crypto.randomUUID()

  // If we get here, URL doesn't have country code - determine which one to use
  let targetCountry = ""

  // Priority:  1. URL country (if exists) 2. Vercel geo-IP header
  // 3. DEFAULT_REGION 4. First available region
  const vercelCountry = request.headers.get("x-vercel-ip-country")?.toLowerCase()

  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    targetCountry = urlCountryCode
  } else if (vercelCountry && regionMap.has(vercelCountry)) {
    targetCountry = vercelCountry
  } else if (regionMap.has(DEFAULT_REGION)) {
    targetCountry = DEFAULT_REGION
  } else if (regionMap.size > 0) {
    targetCountry = regionMap.keys().next().value || ""
  }

  // If no valid country found, check if regionMap is just empty
  if (!targetCountry) {
    if (regionMap.size === 0) {
      // Return error - regions not loaded
      return new NextResponse(
        "Unable to load regions. Please ensure Medusa backend is properly configured.",
        { status: 503 }
      )
    }
  }

  // Redirect to region-prefixed URL
  if (targetCountry) {
    const redirectPath =
      pathname === "/" ? "" : pathname
    const queryString = request.nextUrl.search || ""
    const redirectUrl = `${request.nextUrl.origin}/${targetCountry}${redirectPath}${queryString}`

    const response = NextResponse.redirect(redirectUrl, 307)
    
    // Set cache cookie
    if (!cacheIdCookie) {
      response.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
    }

    return response
  }

  // Fallback: just pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
