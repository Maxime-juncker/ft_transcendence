CERT_DIR="/etc/nginx/ssl"
KEY_FILE="$CERT_DIR/nginx.key"
CERT_FILE="$CERT_DIR/nginx.crt"
SUBJ="/C=FR/ST=ge/L=CHARBONIERE/O=ME/CN=mjuncker.42.fr"

mkdir -p "$CERT_DIR"

if [ "$(ls -A $CERT_DIR)" ]; then
	echo "key already generated"
	exec nginx -g "daemon off;"
fi

echo "generating new ssl keys"
openssl req -x509 -nodes -newkey rsa:2048 \
	-keyout "$KEY_FILE" \
	-out "$CERT_FILE" \
	-days 365 \
	-subj "$SUBJ"

cd /var/www/html

npm init -y
npm install -D tailwindcss@3 postcss autoprefixer typescript
cat << EOF > tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default { content: ["index.html"], theme: { extend: {}, }, plugins: [], }
EOF

npx tailwindcss -i css/input.css -o css/output.css
npx tsc

exec nginx -g "daemon off;"
