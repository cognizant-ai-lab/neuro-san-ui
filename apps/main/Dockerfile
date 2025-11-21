#    Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.
#    
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#    
#        http://www.apache.org/licenses/LICENSE-2.0
#    
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.

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

ENV NODE_ENV=development

# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
COPY .yarnrc.yml ./
COPY package.json ./
COPY yarn.lock ./
COPY tsconfig.json ./
COPY packages/ui-common ./packages/ui-common
COPY apps/main/package.json ./apps/main/package.json

# Install all dependencies (including devDependencies) and build ui-common
RUN --mount=type=cache,target=/root/.cache/yarn \
    corepack enable && \
    corepack install && \
    yarn install --immutable && \
    yarn build:lib

# Rebuild the source code only when needed
FROM node:$NODEJS_VERSION-bookworm-slim AS builder

ENV NODE_ENV=production

# Disable NextJS spyware
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Install only production dependencies
COPY .yarnrc.yml ./
COPY package.json ./
COPY packages/ui-common/package.json ./packages/ui-common/package.json
COPY apps/main/package.json ./apps/main/package.json
COPY yarn.lock ./

# Copy the full ui-common package from deps (includes source + built dist)
COPY --from=deps /app/packages/ui-common ./packages/ui-common

RUN --mount=type=cache,target=/root/.cache/yarn \
    corepack enable && \
    corepack install && \
    yarn install --immutable

# Extra files from build context
COPY tsconfig.json ./tsconfig.json
COPY apps/main ./apps/main

# Extract build version
ARG NEXT_PUBLIC_NEURO_SAN_UI_VERSION
ENV NEXT_PUBLIC_NEURO_SAN_UI_VERSION=${NEXT_PUBLIC_NEURO_SAN_UI_VERSION}

# Extract authentication setting
ARG NEXT_PUBLIC_ENABLE_AUTHENTICATION
ENV NEXT_PUBLIC_ENABLE_AUTHENTICATION=${NEXT_PUBLIC_ENABLE_AUTHENTICATION}

# Build the Next.js app
RUN yarn build:app 


# Production image, copy all the files and run next
FROM gcr.io/distroless/nodejs${NODEJS_VERSION}-debian12@sha256:1c481261b3b1c6ec601cc11d3cea0c7d02e551e5041f8dcd47e077029e57a6bc AS runner

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
