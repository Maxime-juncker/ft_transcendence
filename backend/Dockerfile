FROM alpine:3.20

RUN apk update && apk upgrade
RUN apk add php-fpm nodejs npm
RUN apk add sqlite bash make

COPY ./db.sql /db.sql

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY src/ /var/www/server
# COPY node_modules/ /var/www/server/node_modules
# COPY package.json /var/www/server/package.json

CMD ["bash", "/entrypoint.sh"] 
