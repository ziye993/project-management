FROM node:22-bookworm-slim AS web-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json ./web/
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --ignore-scripts \
  && npm ci --prefix web \
  && npm ci --prefix server --omit=dev
COPY web ./web
RUN npm run build --prefix web

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    DOCKER=1 \
    OPEN_BROWSER=0 \
    DEPLOYMENT_ROLE=log_server

COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --ignore-scripts \
  && npm ci --prefix server --omit=dev \
  && rm -rf /root/.npm

COPY main.js ./
COPY server ./server
COPY --from=web-builder /app/html ./html

RUN mkdir -p /app/data

EXPOSE 30014
VOLUME ["/app/data"]

CMD ["node", "main.js"]
