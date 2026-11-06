# syntax=docker/dockerfile:1
# ---------- build stage ----------
FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_MF_CLIENTES_URL=http://localhost:5001/remoteEntry.js
ARG VITE_MF_VENTAS_URL=http://localhost:5002/remoteEntry.js
ENV VITE_MF_CLIENTES_URL=$VITE_MF_CLIENTES_URL
ENV VITE_MF_VENTAS_URL=$VITE_MF_VENTAS_URL
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
