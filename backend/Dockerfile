FROM alpine:3.20

RUN apk update && apk upgrade
RUN apk add php-fpm nodejs npm
RUN apk add sqlite bash

COPY ./db.sql /db.sql

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY src/ /var/www/server

CMD ["bash", "/entrypoint.sh"] 
