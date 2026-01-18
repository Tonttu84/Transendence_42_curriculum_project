FROM node:25-alpine AS build

WORKDIR /app
ENV CI=true

COPY frontend ./frontend
RUN npm install -g pnpm
RUN cd frontend && pnpm install --frozen-lockfile
RUN cd frontend && pnpm build

FROM nginx:stable-alpine

RUN apk add --no-cache openssl


RUN mkdir -p /etc/nginx/certs

RUN openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/nginx/certs/key.pem \
    -out /etc/nginx/certs/cert.pem \
    -subj "/CN=localhost"

COPY --from=build /app/frontend/dist /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf