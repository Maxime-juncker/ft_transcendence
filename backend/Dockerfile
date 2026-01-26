FROM alpine:3.20

RUN apk add --update --no-cache php-fpm	\
								nodejs	\
								npm		\
 								sqlite	\
								bash	\
								make

COPY ./db.sql /db.sql

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY src/ /var/www/server
COPY config.json /config.json

RUN mkdir -p /var/www/server/public/avatars/
COPY ./avatars/ /avatars

WORKDIR /var/www/server

CMD ["bash", "/entrypoint.sh"]
