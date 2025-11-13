FROM rust:1-alpine3.20

RUN apk update && apk upgrade
RUN apk add bash

WORKDIR /app

COPY ./entrypoint.sh .
RUN chmod +x ./entrypoint.sh

CMD ["bash", "./entrypoint.sh"]