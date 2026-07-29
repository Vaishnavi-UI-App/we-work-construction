FROM node:18-alpine
# openssl for Prisma; build-base/python3 so native modules (bcrypt) compile on musl
RUN apk add --no-cache openssl openssl-dev python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
RUN mkdir -p /uploads/receipts /uploads/org-docs /app/data
EXPOSE 4001
ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
