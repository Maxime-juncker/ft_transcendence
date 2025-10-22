import { GameClient } from './GameClient.js';

export class Router
{
	private static readonly EXIT_KEY: string = 'Escape';

	currentPage: string = 'home';
	pages: Map<string, HTMLDivElement> = new Map();
	gameInstance: GameClient | null = null;

	constructor()
	{
		this.loadPages();
		this.setupEventListeners();
		this.showPage(this.currentPage);
	}

	private loadPages(): void
	{
		const pageElements = document.querySelectorAll<HTMLDivElement>('section');

		pageElements.forEach(element =>
		{
			const pageName = element.getAttribute('class');
			if (pageName)
			{
				this.pages.set(pageName, element);
			}
		});
	}

	private setupEventListeners(): void
	{
		window.addEventListener('popstate', (e) =>
		{
			const page = e.state?.page || 'home';
			this.showPage(page);
		});

		window.addEventListener('keydown', (e) =>
		{
			if (e.key === Router.EXIT_KEY && this.currentPage !== 'home')
			{
				this.showPage('home');
			}
		});
	}

	private clearPages(): void
	{
		if (this.gameInstance)
		{
			this.gameInstance.destroy();
		}

		for (const element of this.pages.values())
		{
			element.style.display = 'none';
		}
	}

	private showPage(page: string)
	{
		this.clearPages();
		this.pages.get(page)!.style.display = 'flex';
		this.currentPage = page;

		if (page === 'game')
		{
			this.gameInstance = new GameClient();
		}
	}

	public navigateTo(page: string): void
	{
		history.pushState({page: page}, '', `#${page}`);
		this.showPage(page);
	}
};

const router = new Router();

document.getElementById('1player')?.addEventListener('click', () =>
{
});

document.getElementById('2player')?.addEventListener('click', () =>
{
	router.navigateTo('game');
});
