import i18n from 'https://cdn.skypack.dev/i18next';
import Backend from 'https://cdn.skypack.dev/i18next-http-backend';
import LanguageDetector from 'https://cdn.skypack.dev/i18next-browser-languagedetector';

const selectElement = document.getElementById('language-selector');
const templateId = document.querySelector('template').id;
const pageName = templateId.replace('-template', '');

i18n.use(Backend).use(LanguageDetector).init({
	fallbackLng: 'en',
	backend: {
	  loadPath: `/public/locales/{{lng}}/${pageName}.json`,
	},
});

function translatePage() {
	document.querySelectorAll('[data-i18n]').forEach(el => {
	  const key = el.getAttribute('data-i18n');
	  const options = JSON.parse(el.getAttribute('data-i18n-options') || '{}');
	  el.textContent = i18n.t(key, options);
	});
}

function updateLanguageSelector() {
	selectElement.value = i18n.language;
}

i18n.on('initialized', () => {
	updateLanguageSelector();
	translatePage();
});

i18n.on('languageChanged', () => {
	updateLanguageSelector();
	translatePage();
});

window.changeLanguage = (lng) => i18n.changeLanguage(lng);