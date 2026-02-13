import { GameMenu } from 'modules/game/GameMenu.js';
import { GameClient } from 'modules/game/GameClient.js';
import { TournamentMenu } from 'modules/tournament/TournamentMenu.js';
import { TournamentLobby } from 'modules/tournament/TournamentLobby.js';
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

	private m_playerContainer:	HTMLElement | null = null;

	currentPage: string = 'home';
	currentClass: any = null;
	pages: Map<string, HTMLDivElement> = new Map();
	gameInstance: GameClient | null = null;
	m_user:			User | null = null;
	m_player1:		UserElement | null = null;
	m_chat:			Chat | null = null;
	m_gameMenu:		GameMenu | null = null;
	m_lobby:		TournamentLobby | null = null;
	m_tournamentMenu: TournamentMenu | null = null;

	m_view:		ViewComponent | null = null;

	get view(): ViewComponent | null { return this.m_view; }
	get lobby(): TournamentLobby | null { return this.m_lobby; }
	get	tournamentMenu(): TournamentMenu | null { return this.m_tournamentMenu; }

	constructor(user: User | null = null, chat: Chat | null = null, view: ViewComponent | null = null)
	{
		this.m_user = user;
		this.m_chat = chat;
		this.m_view = view;
		this.loadPages();
		this.setUpWindowEventListeners();
		this.showPage(this.currentPage, '');

		if (view)
			this.m_playerContainer = view.querySelector("#player-container");
	}

	private cleanupPlayerContainer()
	{
		this.m_tournamentMenu = null;
		this.m_lobby = null;
		if (this.m_playerContainer)
			this.m_playerContainer.innerHTML = "";
	}

	public assignListener()
	{
		if (this.m_view)
		{
			this.m_view.querySelector('#local-game')?.addEventListener("click", this.localGameClickHandler);
			this.m_view.querySelector('#online-game')?.addEventListener("click", this.onlineGameClickHandler);
			this.m_view.querySelector('#bot-game')?.addEventListener("click", this.botGameClickHandler);
			this.m_view.querySelector('#game')?.addEventListener("click", this.menuGameClickHandler);
			this.m_view.querySelector('#tournament')?.addEventListener("click", this.menuTournamentClickHandler);
		}
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
		const root = this.m_view || document;
		const pageElements = root.querySelectorAll<HTMLDivElement>('section');

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
		}
	}

	public navigateTo(page: string, mode: string): void
	{
		this.cleanupPlayerContainer();
		this.showPage(page, mode);
	}

	private showPage(page: string, mode: string): void
	{
		if (this.currentClass && this.currentClass.destroy)
		{
			this.currentClass.destroy();
		}

		const currentPageElement = this.pages.get(this.currentPage);
		const newPageElement = this.pages.get(page);

		if (!newPageElement)
		{
			console.error('Page not found:', page);
			return ;
		}

		if (currentPageElement)
		{
			currentPageElement.style.display = 'none';
		}

		newPageElement.style.display = 'flex';
		this.currentPage = page;
		this.currentClass = this.getClass(mode);
	}

	private getClass(mode: string)
	{
		switch (this.currentPage)
		{
			case 'game-menu':
				this.m_gameMenu = new GameMenu(this)
				return this.m_gameMenu;
			case 'game':
				if (this.m_chat && this.m_user)
					this.gameInstance = new GameClient(this, mode!, this.m_user, this.m_chat);
					return (this.gameInstance);
			case 'tournament-menu':
				this.m_tournamentMenu = new TournamentMenu(this);
				return (this.m_tournamentMenu);
			case 'tournament-lobby':
				if (this.m_user)
				{
					this.m_lobby = new TournamentLobby(this, this.m_user, mode, this.m_chat!);
					return this.m_lobby;
				}
			default:
				return (null);
		}
	}
}
