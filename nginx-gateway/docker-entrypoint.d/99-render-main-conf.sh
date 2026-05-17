#!/bin/sh
set -eu

: "${AUTH_SERVICE_HOST:=auth-service}"
: "${SCHOLARSHIP_SERVICE_HOST:=scholarship-service}"
: "${CHAT_SERVICE_HOST:=chat-service}"
: "${MATCHING_SERVICE_HOST:=matching-service}"
: "${FRONTEND_HOST:=frontend-app}"

envsubst '${AUTH_SERVICE_HOST} ${SCHOLARSHIP_SERVICE_HOST} ${CHAT_SERVICE_HOST} ${MATCHING_SERVICE_HOST} ${FRONTEND_HOST}' \
  < /etc/nginx/main-templates/nginx.conf.template \
  > /etc/nginx/nginx.conf
