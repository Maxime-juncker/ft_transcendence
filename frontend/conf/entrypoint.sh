cd /var/www/html

npm install
npm run build

echo "frontend online"
exec nginx -g "daemon off;"
