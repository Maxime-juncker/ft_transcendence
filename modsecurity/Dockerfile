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
	linux-headers

RUN	git clone --recursive https://github.com/Bluesmoothie/ModSecurity.git	&& \
	cd ModSecurity															&& \
	./build.sh																&& \
	./configure																&& \
	make -j$(nproc)																	&& \
	make install

RUN	git clone https://github.com/Bluesmoothie/ModSecurity-nginx.git		&& \
	wget https://nginx.org/download/nginx-1.26.3.tar.gz					&& \
	tar -xvzf nginx-1.26.3.tar.gz										&& \
	cd nginx-1.26.3														&& \
	./configure --add-dynamic-module=../ModSecurity-nginx --with-compat	&& \
	make modules

RUN git clone https://github.com/Bluesmoothie/coreruleset.git

FROM alpine:3.20 AS prod

COPY --from=dev /usr/local/modsecurity /usr/local/modsecurity
COPY --from=dev /coreruleset /usr/local/owasp-modsecurity-crs
COPY --from=dev /nginx-1.26.3/objs/ngx_http_modsecurity_module.so /usr/lib/nginx/modules/
COPY --from=dev /ModSecurity/unicode.mapping /etc/nginx/modsec/

COPY conf/nginx/ /etc/nginx/
COPY conf/modsec/ /etc/nginx/modsec/

RUN apk update			&& \
	apk add  --no-cache 	\
	nginx=1.26.3-r0

WORKDIR /usr/share/nginx/html

EXPOSE 80 443

ENTRYPOINT [ "nginx", "-g", "daemon off;" ]