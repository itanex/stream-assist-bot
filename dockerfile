# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.0.0

FROM node:${NODE_VERSION}-alpine as base
WORKDIR /app

FROM base as build
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci
USER node
COPY . .
RUN npm run type-check

FROM build as prod
ENV NODE_ENV production
CMD npm start
