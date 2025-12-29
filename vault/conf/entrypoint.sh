CERT_DIR="/ssl"
KEY_FILE="$CERT_DIR/vault.key"
CERT_FILE="$CERT_DIR/vault.crt"
SUBJ="/C=FR/ST=Auvergne-Rhône-Alpes/L=Charbonnières-les-Bains/O=42/CN=transcendence.42lyon.fr"

if [ "$(ls -A $CERT_DIR)" ]; then
	echo "Launching Vault"
	exec docker-entrypoint.sh
fi

echo "Generating ssl cert"
openssl req -x509 -nodes -newkey rsa:2048	\
	-keyout "$KEY_FILE"						\
	-out "$CERT_FILE"						\
	-days 365								\
	-subj "$SUBJ"

echo "Launching Vault"
exec docker-entrypoint.sh