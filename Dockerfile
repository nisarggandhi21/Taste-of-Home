FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./api/
COPY client/package*.json ./client/

RUN npm ci --prefix api && npm ci --prefix client

COPY api ./api
COPY client ./client

ENV NODE_ENV=development

EXPOSE 8800 5173

CMD ["sh", "-c", "cd /app/api && npm start & cd /app/client && npm run dev -- --host 0.0.0.0 --port 5173"]
