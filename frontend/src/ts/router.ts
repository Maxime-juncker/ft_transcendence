import { GameClient } from './GameClient.js';

export class Router
{
	private static readonly EXIT_KEY: string = 'Escape';
	private static readonly homeButton1: string = 'one player';
	private static readonly homeButton2: string = 'two player';
	private button1Element = document.getElementById('1player') as HTMLButtonElement;
	private button2Element = document.getElementById('2player') as HTMLButtonElement;

	currentPage: string = 'home';
	pages: Map<string, HTMLDivElement> = new Map();
	gameInstance: GameClient | null = null;

	constructor()
	{
		this.loadPages();
		this.setupEventListeners();
		this.showPage(this.currentPage, null);
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
		this.setUpWindowEventListeners();
		this.setUpDocumentEventListeners();		
	}

	private setUpWindowEventListeners(): void
	{
		window.addEventListener('popstate', (e) =>
		{
			const page = e.state?.page || 'home';
			this.showPage(page, null);
		});

		window.addEventListener('keydown', (e) =>
		{
			if (e.key === Router.EXIT_KEY)
			{
				history.back();
			}
			else if (e.key === 'h')
			{
				history.pushState({page: 'home'}, '', `#home`);
			}
		});
	}

	private setUpDocumentEventListeners(): void
	{
		document.getElementById('1player')?.addEventListener('click', () =>
		{
			this.navigateTo('game', '1player');
		});

		document.getElementById('2player')?.addEventListener('click', () =>
		{
			this.navigateTo('game', '2player');
		});
	}


	private showPage(page: string, mode: string): void
	{
		if (this.gameInstance)
		{
			this.gameInstance.destroy();
		}

		this.pages.get(this.currentPage)!.style.display = 'none';
		this.pages.get(page)!.style.display = 'flex';
		this.currentPage = page;

		if (page === 'home')
		{
			this.button1Element.textContent = Router.homeButton1;
			this.button2Element.textContent = Router.homeButton2;
		}
		if (page === 'game')
		{
			this.gameInstance = new GameClient(mode);
		}
	}

	private navigateTo(page: string, mode: string): void
	{
		history.pushState({page: page}, '', `#${page}`);
		this.showPage(page, mode);
	}
};

new Router();
