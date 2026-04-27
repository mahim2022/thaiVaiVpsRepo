const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME
const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

let backendRemotePatterns = []

const getRemotePattern = (value) => {
  try {
    const parsed = new URL(value)
    return {
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
    }
  } catch {
    return null
  }
}

if (MEDUSA_BACKEND_URL) {
  const backendRemotePattern = getRemotePattern(MEDUSA_BACKEND_URL)

  if (backendRemotePattern) {
    backendRemotePatterns.push(backendRemotePattern)
  }
}

if (NEXT_PUBLIC_BASE_URL) {
  const storefrontRemotePattern = getRemotePattern(NEXT_PUBLIC_BASE_URL)

  if (storefrontRemotePattern) {
    backendRemotePatterns.push(storefrontRemotePattern)
  }
}

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverActions: {
      // Custom order requests can include multiple images; raise default 1MB limit.
      bodySizeLimit: "35mb",
    },
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV !== "production",
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      ...backendRemotePatterns,
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
