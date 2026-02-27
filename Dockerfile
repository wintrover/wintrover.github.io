# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# 의존성 정의 파일 먼저 복사 (레이어 캐싱 최적화)
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# 소스 코드 복사 (규칙에 따라 가장 상위 레이어/나중에 위치)
COPY . .

# 빌드 실행
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS runner

WORKDIR /app

# 빌드 결과물 및 실행에 필요한 파일만 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Vite preview 등을 사용하여 실행 (또는 별도의 웹 서버 설정 가능)
EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host"]
