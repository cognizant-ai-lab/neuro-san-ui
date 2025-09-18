#
# This is the Dockerfile for building the UI/NodeJS Docker image.
#
# Taken from here with slight modifications: https://github.com/vercel/next.js/blob/main/examples/with-docker/Dockerfile
#
# It uses multi-stage builds for a smaller resulting image 
#

# This is the major version of NodeJS we will enforce
# Check in Codefresh to see what the variable is set to if you want to see the official version of NodeJS we are targeting
ARG NODEJS_VERSION

FROM node:$NODEJS_VERSION-bookworm-slim AS deps

ENV NODE_ENV production

WORKDIR /app
COPY package.json yarn.lock ./
COPY ../../generated ./generated
RUN corepack enable && corepack install && yarn --version && yarn install --immutable

# Rebuild the source code only when needed
FROM node:$NODEJS_VERSION-bookworm-slim AS builder

ENV NODE_ENV production

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Extract build version
ARG NEXT_PUBLIC_NEURO_SAN_UI_VERSION
ENV NEXT_PUBLIC_NEURO_SAN_UI_VERSION ${NEXT_PUBLIC_NEURO_SAN_UI_VERSION}

RUN corepack enable && corepack install && yarn build:app

# Production image, copy all the files and run next
FROM node:$NODEJS_VERSION-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV production

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing


#COPY --from=builder --chown=nonroot:nonroot /app/apps/main/.next/standalone/ ./
#COPY --from=builder --chown=nonroot:nonroot /app/apps/main/.next/static ./.next/static

COPY --from=builder /app/apps/main/public ./public
COPY --from=builder --chown=nonroot:nonroot /app/apps/main/.next/standalone /app/apps/main/
COPY --from=builder --chown=nonroot:nonroot /app/apps/main/.next/static /app/apps/main/.next/static

# The "nonroot" non-privileged user is provided by the base image
USER nonroot

EXPOSE 3000

# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED 1

WORKDIR /app/apps/main

# This "server.js" file is generated at compile time by NextJS magic.
# See: https://nextjs.org/docs/advanced-features/output-file-tracing
CMD ["server.js"]
