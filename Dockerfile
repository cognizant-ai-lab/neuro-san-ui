#
# This is the Dockerfile for building the UI/NodeJS Docker image.
#
# Taken from here with slight modifications: https://github.com/vercel/next.js/blob/main/examples/with-docker/Dockerfile
#
# It uses multi-stage builds for a smaller resulting image
#

# This is the major version of NodeJS we will enforce
ARG NODE_VERSION=16

FROM node:$NODE_VERSION-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --quiet --no-progress --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --silent --prefer-offline --frozen-lockfile --non-interactive

# Rebuild the source code only when needed

FROM node:$NODE_VERSION-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass in the gateway (production or staging) at docker build time
# This value is provided in codefresh where we build both
# flavors in parallel. This env var needs to be set before
# the yarn build command.
ARG GATEWAY
ENV MD_SERVER_URL ${GATEWAY}

# Use yarn to build and install dependencies
RUN yarn build

# Production image, copy all the files and run next
FROM node:$NODE_VERSION-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# You only need to copy next.config.js if you are NOT using the default configuration
# COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Not sure why we need this -- should have been copied over from the builder stage, but if we don't do this we get
# "next not found" when running yarn start
RUN yarn add next@12.1.5

USER nextjs
EXPOSE 3000
# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED 1

CMD ["yarn", "start"]
