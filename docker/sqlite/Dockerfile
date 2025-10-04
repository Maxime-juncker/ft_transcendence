FROM alpine:3.20

RUN apk update && apk upgrade
RUN apk add bash curl

COPY ./entrypoint.sh /entrypoint.sh

CMD ["/entrypoint.sh"] 
