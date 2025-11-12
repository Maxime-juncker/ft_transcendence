#!/bin/bash

sqlite3 /var/lib/sqlite/app.sqlite < /db.sql

cd /var/www/server

npm install
npm run build
exec npm run start

