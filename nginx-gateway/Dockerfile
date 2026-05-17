FROM nginx:alpine

# Default image build uses the production gateway config.
# Docker Compose mounts nginx.local.conf over /etc/nginx/nginx.conf for local dev.
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/gateway/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
