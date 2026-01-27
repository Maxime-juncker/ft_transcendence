FROM alpine:3.20

RUN apk --update --no-cache add bash	\
								nodejs	\
								npm		\
								make

COPY src /var/www/app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /var/www/app/

CMD ["bash", "/entrypoint.sh"]
