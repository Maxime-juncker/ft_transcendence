FROM alpine:3.20

RUN apk update && apk upgrade
RUN apk add bash nodejs npm make

WORKDIR /var/www/app/

COPY src /var/www/app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["bash", "/entrypoint.sh"]
