import { Theme } from "modules/pages/Theme.js";

export async function loadTheme(): Promise<Theme[]>
{
	const themes: Theme[] = [];
	const res = await fetch("/public/themes.json");
	const json = await res.json();

	const themesJson = json.themes;

	themesJson.forEach(async (theme: Theme) => {
		themes.push(theme);
	});
	return themes;
}
