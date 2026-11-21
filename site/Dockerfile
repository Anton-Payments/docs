# The docs site, for Cloud Run. Build context is the repo root, because the site reads the
# contract (openapi-merchant.yaml) and the published-endpoint list (docs.json, api-reference/)
# from beside it at runtime.
#   docker build -f site/Dockerfile -t docs-site .

FROM node:22-alpine AS build
# 1 for a preview image: robots.txt and an X-Robots-Tag header keep it out of search. Both are fixed at build time.
ARG DOCS_PREVIEW=0
ENV DOCS_PREVIEW=${DOCS_PREVIEW} NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/site
COPY site/package.json site/package-lock.json ./
# the postinstall step generates code from source.config.ts, which isn't copied yet; run it after
RUN npm ci --ignore-scripts
COPY openapi-merchant.yaml docs.json /app/
COPY api-reference /app/api-reference
COPY site/ ./
RUN npx fumadocs-mdx && npm run build && npm prune --omit=dev --ignore-scripts

FROM node:22-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080
WORKDIR /app/site
COPY --from=build /app/openapi-merchant.yaml /app/docs.json /app/
COPY --from=build /app/api-reference /app/api-reference
# owned by node: the MDX loader regenerates .source when the server starts
COPY --from=build --chown=node:node /app/site ./
USER node
EXPOSE 8080
CMD ["sh", "-c", "exec node_modules/.bin/next start -p ${PORT}"]
