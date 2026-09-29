FROM node:22-alpine

RUN apk add --no-cache bash
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
RUN chown appuser:appgroup /app
USER appuser

COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup shyftlabs-dsl-v*.tgz ./
COPY --chown=appuser:appgroup carter-dsl-v*.tgz ./
RUN yarn install --non-interactive --silent

COPY --chown=appuser:appgroup . .

ARG NEXT_PUBLIC_CRM_API_BASE_URL
ENV NEXT_PUBLIC_CRM_API_BASE_URL=$NEXT_PUBLIC_CRM_API_BASE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_BASE_URL
ENV NEXT_PUBLIC_APP_BASE_URL=$NEXT_PUBLIC_APP_BASE_URL
ARG NEXT_PUBLIC_PARENT_ORIGIN
ENV NEXT_PUBLIC_PARENT_ORIGIN=$NEXT_PUBLIC_PARENT_ORIGIN
ARG NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_ALLOW_INSECURE
ENV NEXT_PUBLIC_ALLOW_INSECURE=$NEXT_PUBLIC_ALLOW_INSECURE

ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN yarn build
CMD ["yarn", "start"]
