#!/bin/bash

sqlite3 /var/lib/sqlite/app.sqlite < /db.sql

cd /var/www/server

npm install
npx tsc

exec node ./dist/main.js
