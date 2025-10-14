FROM alpine:3.20 AS dev

RUN apk update			&& \
	apk add  --no-cache 	\
	git						\
	libtool					\
	automake				\
	autoconf				\
	gawk					\
	make					\
	g++						\
	flex					\
	byacc					\
	yajl-dev				\
	pcre2-dev				\
	libxml2-dev				\
	curl-dev				\
	linux-headers			\
	ssdeep					\
	libfuzzy2-dev			\
	libssl3

RUN	git clone --recursive https://github.com/Bluesmoothie/ModSecurity.git	&& \
	cd ModSecurity															&& \
	./build.sh																&& \
	./configure																&& \
	make -j$(nproc)															&& \
	make install

RUN	git clone https://github.com/Bluesmoothie/ModSecurity-nginx.git													&& \
	wget https://nginx.org/download/nginx-1.26.3.tar.gz																&& \
	tar -xvzf nginx-1.26.3.tar.gz																					&& \
	cd nginx-1.26.3																									&& \
	./configure --add-dynamic-module=../ModSecurity-nginx --with-compat --prefix=/etc/nginx --with-http_ssl_module	&& \
	make -j$(nproc)																									&& \
	make install

RUN git clone https://github.com/Bluesmoothie/coreruleset.git

FROM alpine:3.20 AS prod

RUN apk update			&& \
	apk add  --no-cache 	\
	libcurl					\
	libxml2					\
	pcre2					\
	yajl					\
	libstdc++				\
	ssdeep					\
	libfuzzy2				\
	libssl3					\
	openssl

COPY --from=dev /etc/nginx/ /etc/nginx/
COPY --from=dev /usr/local/modsecurity /usr/local/modsecurity
COPY --from=dev /coreruleset /etc/nginx/conf/modsec/owasp_crs/
COPY --from=dev /nginx-1.26.3/objs/ngx_http_modsecurity_module.so /var/lib/nginx/modules/
COPY --from=dev /ModSecurity/unicode.mapping /etc/nginx/conf/modsec/

COPY conf/nginx/ /etc/nginx/conf/
COPY conf/modsec/ /etc/nginx/conf/modsec/
COPY conf/entrypoint.sh /entrypoint.sh

RUN ln -s /etc/nginx/sbin/nginx /usr/sbin/nginx			&& \
	addgroup -S nginx									&& \
	adduser -S -D -H -s /sbin/nologin -G nginx nginx	&& \
	mkdir /var/log/nginx

EXPOSE 80 443

ENTRYPOINT [ "nginx", "-g", "daemon off;" ]