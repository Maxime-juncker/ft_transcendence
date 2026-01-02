cd /var/www/html

npm install
npm run build

exec nginx -g "daemon off;"
