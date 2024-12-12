#
# This is the Dockerfile for building the UI/NodeJS Docker image.
#
# Taken from here with slight modifications: https://github.com/vercel/next.js/blob/main/examples/with-docker/Dockerfile
#
# It uses multi-stage builds for a smaller resulting image 
#

# This is the major version of NodeJS we will enforce
# Currently we are targeting 16. Pass in via build argument
ARG NODEJS_VERSION

FROM node:$NODEJS_VERSION-bullseye-slim AS deps

ENV NODE_ENV production

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
WORKDIR /app
COPY package.json yarn.lock ./
COPY proto ./proto
RUN yarn install --production --silent --prefer-offline --frozen-lockfile --non-interactive

# Rebuild the source code only when needed
FROM node:$NODEJS_VERSION-bullseye-slim AS builder

ENV NODE_ENV production

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/proto ./proto
COPY . .

# Extract build version
ARG UNILEAF_VERSION
ENV UNILEAF_VERSION ${UNILEAF_VERSION}

# Install protobuf compiler and lib
RUN apt-get update && \
    apt-get install --quiet --assume-yes --no-install-recommends --no-install-suggests \
      protobuf-compiler=3.12.4-1+deb11u1 libprotobuf-dev=3.12.4-1+deb11u1 ca-certificates=01-ca-certificates_20210119_all.deb \
      curl=7.74.0-1.3+deb11u14

# Deal with github pat in order to clone neuro-san repo
# which is part of the do_typescript_generate script called below
RUN --mount=type=secret,id=LEAF_SOURCE_CREDENTIALS \
    export LEAF_SOURCE_CREDENTIALS=$(cat /run/secrets/LEAF_SOURCE_CREDENTIALS) \
    && /bin/bash -c "./grpc/do_typescript_generate.sh" \
    && yarn build

# Production image, copy all the files and run next
FROM gcr.io/distroless/nodejs:$NODEJS_VERSION AS runner

WORKDIR /app
ENV NODE_ENV production

# You only need to copy next.config.js if you are NOT using the default configuration
# COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static

# The "nonroot" non-privileged user is provided by the base image
USER nonroot

EXPOSE 3000

# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED 1

# This "server.js" file is generated at compile time by NextJS magic.
# See: https://nextjs.org/docs/advanced-features/output-file-tracing
CMD ["server.js"]
