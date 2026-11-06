# syntax=docker/dockerfile:1
# ---------- build stage ----------
FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
