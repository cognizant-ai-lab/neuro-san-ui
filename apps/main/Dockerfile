#
# This is the Dockerfile for building the UI/NodeJS Docker image.
#
# Taken from here with slight modifications: https://github.com/vercel/next.js/blob/main/examples/with-docker/Dockerfile
#
# It uses multi-stage builds for a smaller resulting image 
#

# This is the major version of NodeJS we will enforce
# Check in CI to see what the variable is set to if you want to see the official version of NodeJS we are targeting
ARG NODEJS_VERSION=22

FROM node:$NODEJS_VERSION-bookworm-slim AS deps

ENV NODE_ENV=production

# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
COPY .yarnrc.yml ./
COPY packages/ui-common/generated ./generated
COPY package.json ./
COPY packages/ui-common/package.json ./packages/ui-common/package.json
COPY apps/main/package.json ./apps/main/package.json
COPY yarn.lock ./

# Install yarn dependencies
RUN --mount=type=cache,target=/root/.cache/yarn \
    corepack enable && \
    corepack install && \
    yarn install --immutable

# Rebuild the source code only when needed
FROM node:$NODEJS_VERSION-bookworm-slim AS builder

ENV NODE_ENV=production

# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# From deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/yarn.lock ./

# Extra files from build context
COPY tsconfig.json ./tsconfig.json
COPY package.json ./package.json
COPY .yarnrc.yml ./.yarnrc.yml
COPY packages/ui-common ./packages/ui-common
COPY apps/main ./apps/main

# Extract build version
ARG NEXT_PUBLIC_NEURO_SAN_UI_VERSION
ENV NEXT_PUBLIC_NEURO_SAN_UI_VERSION=${NEXT_PUBLIC_NEURO_SAN_UI_VERSION}

# Build the Next.js app
RUN mount=type=cache,target=/root/.cache/yarn \
    corepack enable && \
    corepack install && \
    yarn build:app 


# Production image, copy all the files and run next
FROM gcr.io/distroless/nodejs$NODEJS_VERSION-debian12@sha256:1c481261b3b1c6ec601cc11d3cea0c7d02e551e5041f8dcd47e077029e57a6bc AS runner

WORKDIR /app
ENV NODE_ENV=production

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/apps/main/.next/standalone ./
COPY --from=builder /app/apps/main/public ./apps/main/public
COPY --from=builder /app/apps/main/.next/static ./apps/main/.next/static

# The "nonroot" non-privileged user is provided by the base image
USER nonroot

EXPOSE 3000

# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/main

# This "server.js" file is generated at compile time by NextJS magic.
# See: https://nextjs.org/docs/advanced-features/output-file-tracing
CMD ["server.js"]
