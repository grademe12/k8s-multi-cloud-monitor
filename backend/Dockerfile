FROM node:22-bookworm-slim

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사
COPY . .

# 빌드 (TypeScript → JavaScript)
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]