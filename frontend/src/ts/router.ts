import { Home } from 'pages/Home.js';
import { GameMenu } from 'pages/GameMenu.js';
import { GameClient } from 'pages/GameClient.js';
import { TournamentMenu } from 'pages/TournamentMenu.js';
import { Tournament } from 'pages/Tournament.js';
import { User } from "User.js";
import { Chat } from '@modules/chat';
import { UserElement } from 'UserElement.js';

export class Router
{
	private static readonly EXIT_KEY: string = 'Escape';
	private static readonly HOME_KEY: string = 'h';
	private static readonly GAME_MENU_KEY: string = 'g';
	private static readonly GAME_ONLINE_KEY: string = 'o';
	private static readonly GAME_LOCAL_KEY: string = 'l';
	private static readonly GAME_BOT_KEY: string = 'b';
	private static readonly TOURNAMENT_MENU_KEY: string = 't';

	currentPage: string = 'home';
	currentClass: any = null;
	pages: Map<string, HTMLDivElement> = new Map();
	gameInstance: GameClient | null = null;
	m_user:			User;
	m_player1:		UserElement;
	m_chat:			Chat;

	constructor(user: User = null, chat: Chat = null)
	{
		this.m_user = user;
		this.m_chat = chat;
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
				element.classList.add('hidden');
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

		window.addEventListener('keydown', async (e) =>
		{
			const targetElement = e.target as HTMLElement;
			if (!targetElement)
			{
				return ;
			}

			const tagName = targetElement.tagName.toLowerCase();
			if (tagName && tagName !== 'input' && tagName !== 'textarea')
			{
				this.handleEventKey(e.key);
			}
		});
	}

	private handleEventKey(key: string): void
	{
		switch (key)
		{
			case Router.EXIT_KEY:
				history.back();
				break ;
			case Router.HOME_KEY:
				this.navigateTo('home', '');
				break ;
			case Router.GAME_MENU_KEY:
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
			case Router.TOURNAMENT_MENU_KEY:
				this.navigateTo('tournament-menu', '');
				break ;
		}
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

		this.pages.get(this.currentPage)!.classList.add('hidden');
		this.pages.get(page)!.classList.remove('hidden');
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
				return (new GameClient(this, mode!, this.m_user, this.m_chat));
			case 'tournament-menu':
				return (new TournamentMenu(this));
			case 'tournament':
				return (new Tournament(mode!, this.m_user));
			default:
				return (null);
		}
	}
}
