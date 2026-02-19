#!/bin/bash

cd /var/www/app
npm install
npm run build

echo "launching benchmark"
exec npm run start
tail -f
