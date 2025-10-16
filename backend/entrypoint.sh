#!/bin/bash

sqlite3 /var/lib/sqlite/app.sqlite < /db.sql

cd /var/www/server

npm init -y
npm install fastify typescript @types/node sqlite3 sqlite undici

make re

node js/server.js

