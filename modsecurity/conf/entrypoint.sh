CERT_DIR="/etc/nginx/conf/ssl"
KEY_FILE="$CERT_DIR/transcendence.key"
CERT_FILE="$CERT_DIR/transcendence.crt"
SUBJ="/C=FR/ST=Auvergne-Rhône-Alpes/L=Charbonnières-les-Bains/O=42/CN=transcendence.42lyon.fr"

if [ "$(ls -A $CERT_DIR)" ]; then
	echo "Launching NGINX"
	exec nginx -g "daemon off;"
fi

echo "Generating ssl cert"
openssl req -x509 -nodes -newkey rsa:2048	\
	-keyout "$KEY_FILE"						\
	-out "$CERT_FILE"						\
	-days 365								\
	-subj "$SUBJ"

echo "Launching NGINX"
exec nginx -g "daemon off;"