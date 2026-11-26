# Production image for the API.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only what the server needs at runtime.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8800
USER node
CMD ["node", "index.js"]
