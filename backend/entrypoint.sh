#!/bin/bash

sqlite3 /var/lib/sqlite/app.sqlite < /db.sql

mkdir -p public/dist/
mkdir -p public/avatars/

cp /avatars/* /var/www/server/public/avatars/.

cd /var/www/server
npm install
npm run build

echo "building css"
./node_modules/.bin/tailwindcss -i ./public/crt.css -o ./public/output_crt.css
npm run build:css

echo "launching server"
exec npm run start

