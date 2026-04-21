FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases

RUN yarn install --immutable

FROM node:20-alpine AS builder
WORKDIR /app

ENV NODE_ENV=production
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG MEDUSA_BACKEND_URL=https://summithire.tech

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN if [ -z "$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" ]; then \
	echo "Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY for storefront production build. Use the prebuilt prod workflow or pass the build arg before building."; \
	exit 1; \
fi

RUN NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" MEDUSA_BACKEND_URL="$MEDUSA_BACKEND_URL" NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=512" yarn build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.prod.sh ./start.prod.sh

RUN sed -i 's/\r$//' ./start.prod.sh && chmod +x ./start.prod.sh

EXPOSE 8000

CMD ["sh", "-c", "sh /app/start.prod.sh"]
