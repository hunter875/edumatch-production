#!/bin/sh
set -eu

: "${FRONTEND_HOST:=frontend-app}"

envsubst '${FRONTEND_HOST}' \
  < /etc/nginx/main-templates/nginx.conf.template \
  > /etc/nginx/nginx.conf
