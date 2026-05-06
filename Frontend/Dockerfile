FROM nginx:alpine

# Patcher les vulnérabilités des packages système alpine (nghttp2, etc.)
RUN apk update && apk upgrade --no-cache

COPY dist/ /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Donner la propriété des répertoires nginx à l'utilisateur nginx (uid 101)
# nécessaire quand on tourne sans root (SecurityContext runAsNonRoot)
RUN chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
