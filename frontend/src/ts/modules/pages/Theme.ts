import * as utils from "modules/utils/utils.js";

export type Theme = {
	name:		string,

	dark:		string,
	darker:		string,
	darkest:	string,
	red:		string,
	yellow:		string,
	blue:		string,
	white:		string,
	green:		string,
	purple:		string,
}

export class ThemeController
{
	private static m_instance: ThemeController | null = null;

	private m_themeName: string;
	private m_themes: Theme[];

	constructor(themes: Theme[], defaultTheme: string = "onedark")
	{
		if (ThemeController.m_instance == null)
			ThemeController.m_instance = this;

		this.m_themes = themes;
		this.m_themeName = defaultTheme;
		this.setGlobalTheme(defaultTheme);
	}

	get themeName(): string { return this.m_themeName; }
	get themes(): Theme[] { return this.m_themes; }
	get currentTheme(): Theme | null { return this.findTheme(this.m_themeName); }
	static get Instance(): ThemeController | null
	{
		return ThemeController.m_instance;
	}

	public setGlobalTheme(themeName: string): number
	{
		const theme = this.findTheme(themeName);
		if (!theme)
		{
			console.warn(`can't find ${themeName}`);
			return 1;
		}
		this.applyTheme(theme);
		utils.setCookie("theme", this.m_themeName, 999999);

		return 0;
	}

	private findTheme(themeName: string)
	{
		var theme: Theme | null = null;

		for (let i = 0; i < this.m_themes.length; i++)
		{
			if (this.m_themes[i].name === themeName)
			{
				theme = this.m_themes[i];
				break;
			}
		}
		return theme;
	}

	private applyTheme(theme: Theme)
	{
		this.m_themeName = theme.name;

		document.documentElement.style.setProperty("--color-dark", theme.dark);
		document.documentElement.style.setProperty("--color-darker", theme.darker);
		document.documentElement.style.setProperty("--color-darkest", theme.darkest);
		document.documentElement.style.setProperty("--color-red", theme.red);
		document.documentElement.style.setProperty("--color-yellow", theme.yellow);
		document.documentElement.style.setProperty("--color-blue", theme.blue);
		document.documentElement.style.setProperty("--color-white", theme.white);
		document.documentElement.style.setProperty("--color-green", theme.green);
		document.documentElement.style.setProperty("--color-purple", theme.purple);
	}

}
