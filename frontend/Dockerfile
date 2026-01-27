FROM alpine:3.20

RUN apk add --update --no-cache nginx	\
								bash	\
								openssl	\
								nodejs	\
								npm		\
								make

WORKDIR /var/www/html/

COPY conf/nginx.conf /etc/nginx/nginx.conf
COPY src /var/www/html

COPY conf/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["bash", "/entrypoint.sh"]
