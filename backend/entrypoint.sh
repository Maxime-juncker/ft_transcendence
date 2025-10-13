#!/bin/bash

sqlite3 /var/lib/sqlite/app.db < /db.sql

cd /var/www/server

npm init -y
npm install fastify
node server.ts

tail -f
