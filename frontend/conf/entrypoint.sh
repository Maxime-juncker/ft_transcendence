cd /var/www/html

npm init -y
npm install -D tailwindcss@3 postcss autoprefixer typescript
cat << EOF > tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default { content: ["index.html"], theme: { extend: {}, }, plugins: [], }
EOF

npx tailwindcss -i css/input.css -o css/output.css
npx tsc

exec nginx -g "daemon off;"
