import { Home } from 'pages/Home.js';
import { GameMenu } from 'pages/GameMenu.js';
import { GameClient } from 'pages/GameClient.js';
import { TournamentMenu } from 'pages/TournamentMenu.js';
import { Tournament } from 'pages/Tournament.js';
import { MainUser } from "User.js";

export class Router
{
	private static readonly EXIT_KEY: string = 'Escape';
	private static readonly HOME_KEY: string = 'h';
	private static readonly GAME_KEY: string = 'g';
	private static readonly GAME_ONLINE_KEY: string = 'o';
	private static readonly GAME_LOCAL_KEY: string = 'l';
	private static readonly GAME_BOT_KEY: string = 'b';
	private static readonly TOURNAMENT_KEY: string = 't';

	currentPage: string = 'home';
	currentClass: any = null;
	pages: Map<string, HTMLDivElement> = new Map();
	gameInstance: GameClient | null = null;

	constructor()
	{
		this.loadPages();
		this.setUpWindowEventListeners();
		this.showPage(this.currentPage, null);
	}

	private loadPages(): void
	{
		const pageElements = document.querySelectorAll<HTMLDivElement>('section');

		pageElements.forEach(element =>
		{
			const pageName = element.getAttribute('id');
			if (pageName)
			{
				this.pages.set(pageName, element);
				this.pages.get(pageName)!.style.display = 'none';
			}
		});
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
			switch (e.key)
			{
				case Router.EXIT_KEY:
					history.back();
					break ;
				case Router.HOME_KEY:
					this.navigateTo('home', '');
					break ;
				case Router.GAME_KEY:
					this.navigateTo('game-menu', '');
					break ;
				case Router.GAME_ONLINE_KEY:
					this.navigateTo('game', 'online');
					break ;
				case Router.GAME_LOCAL_KEY:
					this.navigateTo('game', 'local');
					break ;
				case Router.GAME_BOT_KEY:
					this.navigateTo('game', 'bot');
					break ;
				case Router.TOURNAMENT_KEY:
					this.navigateTo('tournament-menu', '');
					break ;
			}
		});
	}

	public navigateTo(page: string, mode: string): void
	{
		history.pushState({page: page}, '', `#${page}`);
		this.showPage(page, mode);
	}

	private showPage(page: string, mode: string): void
	{
		if (this.currentClass && this.currentClass.destroy)
		{
			this.currentClass.destroy();
		}

		console.log(page, mode);
		this.pages.get(this.currentPage)!.style.display = 'none';
		this.pages.get(page)!.style.display = 'flex';
		this.currentPage = page;
		this.currentClass = this.getClass(mode);
	}

	private getClass(mode: string)
	{
		switch (this.currentPage)
		{
			case 'home':
				return (new Home(this));
			case 'game-menu':
				return (new GameMenu(this));
			case 'game':
				return (new GameClient(mode!));
			case 'tournament-menu':
				return (new TournamentMenu(this));
			case 'tournament':
				return (new Tournament(mode!));
			default:
				return (null);
		}
	}
}

