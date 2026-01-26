FROM alpine:3.20

RUN apk update && apk upgrade
RUN apk add nginx bash openssl nodejs npm make

WORKDIR /var/www/html/

COPY conf/nginx.conf /etc/nginx/nginx.conf
COPY src /var/www/html

COPY conf/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["bash", "/entrypoint.sh"]
