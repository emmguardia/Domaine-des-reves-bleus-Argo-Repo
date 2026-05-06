FROM nginx:alpine

# Patcher les vulnérabilités des packages système alpine (nghttp2, etc.)
RUN apk update && apk upgrade --no-cache

COPY dist/ /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
