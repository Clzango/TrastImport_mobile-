# Builds the Expo web app and serves it with nginx.
#
#   docker build --build-arg EXPO_PUBLIC_API_URL=https://api.example.com -t trastimport-web .
#   docker run -p 8080:80 trastimport-web
#
# EXPO_PUBLIC_API_URL is baked into the JS bundle at build time. Leave it empty
# to build a demo that uses the in-memory mock server.

FROM node:22-slim AS build
WORKDIR /app

# Same npm major as the one that wrote package-lock.json, or `npm ci` rejects it.
RUN npm install -g npm@11.12.1 --no-audit --no-fund
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG EXPO_PUBLIC_API_URL=""
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    EXPO_NO_TELEMETRY=1 \
    CI=1
RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
