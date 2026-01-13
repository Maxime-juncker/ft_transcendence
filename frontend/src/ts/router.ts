import { Home } from 'pages/Home.js';
import { GameMenu } from 'pages/GameMenu.js';
import { GameClient } from 'pages/GameClient.js';
import { TournamentMenu } from 'pages/TournamentMenu.js';
import { TournamentCreate } from 'pages/TournamentCreate.js';
import { TournamentJoin } from 'pages/TournamentJoin.js';
import { TournamentLobby } from 'pages/TournamentLobby.js';
import { User } from "modules/user/User.js";
import { Chat } from 'modules/chat/chat';
import { UserElement } from 'modules/user/UserElement.js';
import { ViewComponent } from 'modules/router/ViewComponent.js';

export class GameRouter
{
	private static readonly EXIT_KEY: string = 'Escape';
	private static readonly HOME_KEY: string = 'h';
	private static readonly GAME_MENU_KEY: string = 'g';
	private static readonly GAME_ONLINE_KEY: string = 'o';
	private static readonly GAME_LOCAL_KEY: string = 'l';
	private static readonly GAME_BOT_KEY: string = 'b';
	private static readonly TOURNAMENT_MENU_KEY: string = 't';
	private static readonly TOURNAMENT_CREATE_KEY: string = 'c';
	private static readonly TOURNAMENT_JOIN_KEY: string = 'j';

	currentPage: string = 'home';
	currentClass: any = null;
	pages: Map<string, HTMLDivElement> = new Map();
	gameInstance: GameClient | null = null;
	m_user:			User | null = null;
	m_player1:		UserElement | null = null;
	m_chat:			Chat | null = null;
	m_gameMenu:		GameMenu | null = null;

	m_view:		ViewComponent | null = null;

	public get view(): ViewComponent | null { return this.m_view; }

	constructor(user: User | null = null, chat: Chat | null = null, view: ViewComponent | null = null)
	{
		this.m_user = user;
		this.m_chat = chat;
		this.m_view = view;
		this.loadPages();
		this.setUpWindowEventListeners();
		this.showPage(this.currentPage, null);

	}

	public assignListener()
	{
		if (!this.m_view)
			return ;
		this.m_view.addTrackListener(this.m_view.querySelector('#local-game'), "click", this.localGameClickHandler);
		this.m_view.addTrackListener(this.m_view.querySelector('#online-game'), "click", this.onlineGameClickHandler);
		this.m_view.addTrackListener(this.m_view.querySelector('#bot-game'), "click", this.botGameClickHandler);
		this.m_view.addTrackListener(this.m_view.querySelector('#game'), "click", this.menuGameClickHandler);
		this.m_view.addTrackListener(this.m_view.querySelector('#tournament'), "click", this.menuTournamentClickHandler);
	}

	private menuGameClickHandler = () =>
	{
		this.navigateTo('game-menu', '');
	}

	private menuTournamentClickHandler = () =>
	{
		this.navigateTo('tournament-menu', '');
	}

	private localGameClickHandler = () =>
	{
		this.navigateTo('game', 'local');
	}

	private onlineGameClickHandler = () =>
	{
		this.navigateTo('game', 'online');
	}

	private botGameClickHandler = () =>
	{
		this.navigateTo('game', 'bot');
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
				element.style.display = "none";
			}
		});
	}

	private setUpWindowEventListeners(): void
	{
 
		// Router.Instance.onPopestate((e) => {
		// 		const page = e.state?.page || 'home';
		// 		this.showPage(page, null);
		// 	});

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
			case GameRouter.EXIT_KEY:
				this.navigateTo('home', '');
				break ;
			case GameRouter.HOME_KEY:
				this.navigateTo('home', '');
				break ;
			case GameRouter.GAME_MENU_KEY:
				this.navigateTo('game-menu', '');
				break ;
			case GameRouter.GAME_ONLINE_KEY:
				this.navigateTo('game', 'online');
				break ;
			case GameRouter.GAME_LOCAL_KEY:
				this.navigateTo('game', 'local');
				break ;
			case GameRouter.GAME_BOT_KEY:
				this.navigateTo('game', 'bot');
				break ;
			case GameRouter.TOURNAMENT_MENU_KEY:
				this.navigateTo('tournament-menu', '');
				break ;
			case GameRouter.TOURNAMENT_CREATE_KEY:
				this.navigateTo('tournament-create', '');
				break ;
			case GameRouter.TOURNAMENT_JOIN_KEY:
				this.navigateTo('tournament-join', '');
				break ;
		}
	}

	public navigateTo(page: string, mode: string): void
	{
		history.pushState({page: page}, '', `#${page}`);
		this.showPage(page, mode);
	}

	private showPage(page: string, mode: string | null): void
	{
		if (this.currentClass && this.currentClass.destroy)
		{
			this.currentClass.destroy();
		}

		this.pages.get(this.currentPage)!.style.display = 'none';
		this.pages.get(page)!.style.display = 'flex';
		this.currentPage = page;
		this.currentClass = this.getClass(mode);
	}


	private getClass(mode: string | null)
	{
		switch (this.currentPage)
		{
			case 'home':
				return (new Home(this));
			case 'game-menu':
				this.m_gameMenu = new GameMenu(this)
				return this.m_gameMenu;
			case 'game':
				if (this.m_chat && this.m_user)
					return (new GameClient(this, mode!, this.m_user, this.m_chat));
			case 'tournament-menu':
				return (new TournamentMenu(this));
			case 'tournament-create':
				if (this.m_user)
					return (new TournamentCreate(this, this.m_user));
			case 'tournament-lobby':
				if (this.m_user)
					return (new TournamentLobby(this, this.m_user, mode));
			case 'tournament-join':
				if (this.m_user)
					return (new TournamentJoin(this.m_user));
			default:
				return (null);
		}
	}
}
