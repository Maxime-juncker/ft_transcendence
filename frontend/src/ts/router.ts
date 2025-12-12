import { Home } from 'pages/Home.js';
import { GameMenu } from 'pages/GameMenu.js';
import { GameClient } from 'pages/GameClient.js';
import { TournamentMenu } from 'pages/TournamentMenu.js';
import { Tournament } from 'pages/Tournament.js';
import { User } from "User.js";
import { Chat } from '@modules/chat';
import { UserElement } from 'UserElement.js';
import { ViewComponent } from 'ViewComponent.js';
import { Router } from 'app.js';

export class GameRouter
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
	m_user:			User;
	m_player1:		UserElement;
	m_chat:			Chat;
	m_gameMenu:		GameMenu = null;

	m_view:		ViewComponent;

	public get view(): ViewComponent { return this.m_view; }

	constructor(user: User = null, chat: Chat = null, view: ViewComponent = null)
	{
		this.m_user = user;
		this.m_chat = chat;
		this.m_view = view;
		this.loadPages();
		this.setUpWindowEventListeners();
		this.showPage(this.currentPage, null);

		view.addTrackListener(view.querySelector('#local-game'), "click", this.localGameClickHandler);
		view.addTrackListener(view.querySelector('#online-game'), "click", this.onlineGameClickHandler);
		view.addTrackListener(view.querySelector('#bot-game'), "click", this.botGameClickHandler);
		view.addTrackListener(view.querySelector('#game'), "click", this.menuGameClickHandler);
		view.addTrackListener(view.querySelector('#tournament'), "click", this.menuTournamentClickHandler);
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
		console.log("navi to online");
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
				element.classList.add('hidden');
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
			switch (e.key)
			{
				case GameRouter.EXIT_KEY:
					await fetch("/api/chat/removeQueue", { 
							method: "DELETE",
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({
								id: this.m_user.id
							})
						});
					this.navigateTo('home', '');
					break ;
				// case Router.HOME_KEY:
				// 	this.navigateTo('home', '');
				// 	break ;
				// case Router.GAME_KEY:
				// 	this.navigateTo('game-menu', '');
				// 	break ;
				// case Router.GAME_ONLINE_KEY:
				// 	this.navigateTo('game', 'online');
				// 	break ;
				// case Router.GAME_LOCAL_KEY:
				// 	this.navigateTo('game', 'local');
				// 	break ;
				// case Router.GAME_BOT_KEY:
				// 	this.navigateTo('game', 'bot');
				// 	break ;
				// case Router.TOURNAMENT_KEY:
				// 	this.navigateTo('tournament-menu', '');
				// 	break ;
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

		this.pages.get(this.currentPage)!.classList.add('hidden');
		this.pages.get(page)!.classList.remove('hidden');
		this.currentPage = page;
		console.log(page);
		this.currentClass = this.getClass(mode);
	}


	private getClass(mode: string)
	{
		switch (this.currentPage)
		{
			case 'home':
				return (new Home(this));
			case 'game-menu':
				this.m_gameMenu = new GameMenu(this)
				return this.m_gameMenu;
			case 'game':
				return (new GameClient(this, mode!, this.m_user, this.m_chat));
			case 'tournament-menu':
				return (new TournamentMenu(this));
			case 'tournament':
				return (new Tournament(mode!));
			default:
				return (null);
		}
	}
}

