cd /var/www/html

npm install
# cat << EOF > tailwind.config.js
# /** @type {import('tailwindcss').Config} */
# export default { content: ["index.html"], theme: { extend: {}, }, plugins: [], }
# EOF

npx tailwindcss -i css/input.css -o css/output.css
npm run build

exec nginx -g "daemon off;"
