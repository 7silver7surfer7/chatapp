FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first: this layer is cached and only rebuilds when
# package files change, not on every code edit.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public ./public

# Don't run as root inside the container.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
