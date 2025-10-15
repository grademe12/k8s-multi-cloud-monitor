FROM node:22-bookworm-slim AS builder

WORKDIR /app

# 의존성 설치 (dev 포함)
COPY package*.json ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 이미지
FROM node:22-bookworm-slim

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --only=production

# 빌드된 파일만 복사
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]