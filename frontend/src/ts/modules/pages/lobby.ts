import { MainUser, User, UserStatus } from "modules/user/User.js";
import { UserElement, UserElementType } from "modules/user/UserElement.js";
import { Chat } from "modules/chat/chat.js";
import { GameRouter } from "modules/game/GameRouter.js";
import { Router } from "modules/router/Router.js";
import { HeaderSmall } from "./HeaderSmall.js";
import { ViewComponent } from "modules/router/ViewComponent.js";
import * as utils from 'modules/utils/utils.js';

	enum ListState
	{
		HIDDEN,
		FRIEND,
		USER,
	}

export class LobbyView extends ViewComponent
{
	private m_chat:	Chat;
	private state:	ListState = ListState.HIDDEN;
	private	m_gameRouter:	GameRouter | null = null;
	private m_loadingIndicator: HTMLElement | null = null;
	private m_isLoading = false;

	constructor()
	{
		super();
		this.m_chat = new Chat();
	}

	public async StartLoading()
	{
		this.m_isLoading = true;
		if (!this.m_loadingIndicator)
		{
			return;
		}

		this.m_loadingIndicator.style.display = "flex";
		const frames = ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'];
		var currFrame = 0;
		const wheel = this.m_loadingIndicator.querySelector("#loading-wheel") as HTMLElement;
		if (!wheel)
			return;

		while (this.m_isLoading)
		{
			wheel.innerText = frames[currFrame % (frames.length)];
			currFrame++;
			await utils.sleep(60);
		}
	}

	public stopLoading()
	{
		this.m_isLoading = false;
		if (!this.m_loadingIndicator)
		{
			return;
		}

		this.m_loadingIndicator.style.display = "none";
	}

	public async init()
	{
		const chatInput: HTMLInputElement = this.querySelector("#chat-in") as HTMLInputElement;
		const chatOutput: HTMLInputElement = this.querySelector("#chat-out") as HTMLInputElement;
		this.m_loadingIndicator = this.querySelector("#loading-indicator") as HTMLInputElement;

		if (!chatInput || !chatOutput || !MainUser.Instance)
			return ;
	    
		this.m_chat.Init(chatOutput, chatInput);
		this.stopLoading();
	}

	public async enable()
	{
		if (!MainUser.Instance)
		{
			console.warn("no main user");
			return;
		}

		if (MainUser.Instance.id == -1)
		{
			Router.Instance?.navigateTo("/");
			return ;
		}

		this.hideUserList();
		MainUser.Instance.displayTutorial();

		if (this.m_chat && !this.m_chat.isConnected)
		{
			this.m_chat.connect();
			this.m_chat.onConnRefresh((conns: User[]) => this.fillUserList(conns));
		}

		if (this.m_gameRouter == null)
		{
			this.m_gameRouter = new GameRouter(MainUser.Instance, this.m_chat, this);
			this.m_gameRouter.assignListener();
			this.m_gameRouter.navigateTo('home', '');
		}

		MainUser.Instance.gameRouter = this.m_gameRouter;

		const container = this.querySelector("#user-list-container") as HTMLElement;
		if (container)
			container.innerHTML = "";

		this.addTrackListener(this.querySelector("#user-list-btn"), "click", () => {
			if (!this.m_chat || !MainUser.Instance) return;
			this.showListContainer(ListState.USER, this.m_chat, MainUser.Instance);
			window.dispatchEvent(new CustomEvent('pageChanged'));
		});
		this.addTrackListener(this.querySelector("#friend-list-btn"), "click", () => {
			if (!this.m_chat || !MainUser.Instance) return;
			this.showListContainer(ListState.FRIEND, this.m_chat, MainUser.Instance);
			window.dispatchEvent(new CustomEvent('pageChanged'));
		});

		new HeaderSmall(MainUser.Instance, this, "header-container");
	}


	public async disable()
	{
		this.clearTrackListener();

		if (this.m_gameRouter?.m_gameMenu)
			this.m_gameRouter.m_gameMenu.destroy();

	}

	private hideUserList()
	{
		const userListParent = this.querySelector("#user-list-parent");
		if (!userListParent)
			return;

		this.state = ListState.HIDDEN;
		userListParent.classList.add("hide");
	}

	private showListContainer(newState: ListState, chat: Chat, user: User)
	{
		const userListParent = this.querySelector("#user-list-parent");
		if (!userListParent) return;
		
		if (this.state != ListState.HIDDEN && this.state == newState)
		{
			userListParent.classList.add("hide");
			this.state = ListState.HIDDEN;
		}
		else
		{
			this.state = newState;
			userListParent.classList.remove("hide");
		}

		if (this.state == ListState.USER && chat.conns)
			this.fillUserList(chat.conns);
		if (this.state == ListState.FRIEND)
			this.fillUserList(user.friends);
	}

	private fillUserList(users: User[])
	{
		const container = this.querySelector("#user-list-container") as HTMLElement;
		container.innerHTML = "";

		const text = document.createElement("p");
		text.innerText = this.state == ListState.USER ? "user list" : "friends list";
		text.setAttribute('data-i18n', this.state == ListState.USER ? "user_list" : "friend_list");
		text.style.color = "var(--color-white)";

		users.forEach((conn: User) => {
			if (conn.status == UserStatus.UNAVAILABLE)
				return ;
			const elt = new UserElement(conn, container, UserElementType.STANDARD, "user-template");
			elt.updateHtml(conn);
		})
		container.prepend(text);
	}
}

