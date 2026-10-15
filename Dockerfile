# Builds the Expo web app and serves it with nginx.
#
#   docker build -t trastimport-web .
#   docker run -p 8080:80 trastimport-web
#
# By default the app calls the API at /api on its own origin, and nginx forwards that
# to API_UPSTREAM (set at run time, e.g. -e API_UPSTREAM=http://host.docker.internal:8000).
# EXPO_PUBLIC_API_URL is baked into the JS bundle at build time: set it to a full URL to
# call an API directly (it must allow this site in CORS), or to "" for the mock server.

FROM node:22-slim AS build
WORKDIR /app

# Same npm major as the one that wrote package-lock.json, or `npm ci` rejects it.
RUN npm install -g npm@11.12.1 --no-audit --no-fund
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG EXPO_PUBLIC_API_URL="/api"
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    EXPO_NO_TELEMETRY=1 \
    CI=1
RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine
# The nginx image fills in ${API_UPSTREAM} in templates when the container starts.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_UPSTREAM=https://trastipmortapp-production.up.railway.app
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
