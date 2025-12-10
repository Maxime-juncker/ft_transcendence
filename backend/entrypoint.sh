#!/bin/bash

sqlite3 /var/lib/sqlite/app.sqlite < /db.sql

cp /default.png /var/www/server/public/avatars/default.png

cd /var/www/server
npm install
npm run build

mkdir -p public/dist/
mkdir -p public/avatars/

npx tailwindcss -i public/game.css -o public/dist/game.css
npx tailwindcss -i public/global.css -o public/dist/global.css
npx tailwindcss -i public/start.css -o public/dist/start.css
npx tailwindcss -i public/login.css -o public/dist/login.css
npx tailwindcss -i public/input.css -o public/dist/output.css

# tail -f
exec npm run start

