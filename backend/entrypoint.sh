#!/bin/bash

sqlite3 /var/lib/sqlite/app.sqlite < /db.sql

cd /var/www/server

npm init -y
npm install fastify typescript @types/node sqlite3 sqlite undici @fastify/multipart @fastify/static sharp file-type
npx tsc

exec node ./dist/main.js
# tail -f

