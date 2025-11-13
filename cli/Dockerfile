FROM alpine:3.20

RUN apk update && apk upgrade
RUN apk add nodejs npm bash

WORKDIR /app

COPY src/ ./src
RUN chmod +x src/cli.js

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["bash", "./entrypoint.sh"]