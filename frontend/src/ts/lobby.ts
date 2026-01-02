import { MainUser, User } from "User.js";
import { UserElement, UserElementType } from "UserElement.js";
import { Chat } from "modules/chat.js";
import { GameRouter } from "router.js";
import { Router } from "app.js";
import { ViewComponent } from "ViewComponent.js";

	enum ListState
	{
		HIDDEN,
		FRIEND,
		USER,
	}

export class LobbyView extends ViewComponent
{
	private m_user:	MainUser | null = null;
	private m_chat:	Chat | null = null;
	private state:	ListState = ListState.HIDDEN;
	private	m_gameRouter:	GameRouter | null = null;

	private m_userContainer: HTMLElement | null = null;

	constructor()
	{
		super();
	}

	public async enable()
	{
		if (Router.Instance?.getCurrentURL() !== "/lobby")
			return ;

		this.m_userContainer = this.querySelector("#user-container");
		this.m_user = new MainUser(this.m_userContainer);

		await this.m_user.loginSession();

		if (this.m_user.id == -1)
		{
			console.warn("user is not log");
			Router.Instance.navigateTo("/");
			return ;
		}
		this.m_user.onLogout((user) => { Router.Instance?.navigateTo("/"); })

		const chatInput: HTMLInputElement = this.querySelector("#chat-in") as HTMLInputElement;
		const chatOutput: HTMLInputElement = this.querySelector("#chat-out") as HTMLInputElement;
		if (!chatInput || !chatOutput)
			return ;
		this.m_chat = new Chat(this.m_user, chatOutput, chatInput);
		this.m_chat.onConnRefresh((conns: User[]) => this.fillUserList(conns));
		this.m_gameRouter = new GameRouter(this.m_user, this.m_chat, this);

		const userMenuContainer = this.querySelector("#user-menu-container");

		this.addTrackListener(this.querySelector("#user-list-btn"), "click", () => {
			if (!this.m_chat || !this.m_user) return;
			this.showListContainer(ListState.USER, this.m_chat, this.m_user);
		});
		this.addTrackListener(this.querySelector("#friend-list-btn"), "click", () => {
			if (!this.m_chat || !this.m_user) return;
			this.showListContainer(ListState.FRIEND, this.m_chat, this.m_user);
		});
		this.addTrackListener(this.querySelector("#user-menu-btn"), "click", () => {
			if (!userMenuContainer) return;
			userMenuContainer.classList.toggle("hide");
		});

		this.addTrackListener(this.querySelector("#banner"), "click", () => Router.Instance?.navigateTo("/"));
		this.addTrackListener(this.querySelector("#logout_btn"), "click", () => this.m_user?.logout());
		this.addTrackListener(this.querySelector("#profile_btn"), "click", () => Router.Instance?.navigateTo("/profile"));
		this.addTrackListener(this.querySelector("#settings_btn"), "click", () => Router.Instance?.navigateTo("/settings"));
	}

	public async disable()
	{
		this.clearTrackListener();

		// TODO: keep chat socket online when going to settings / profile
		if (this.m_user)
		{
			this.m_user.removeFromQueue();
			this.m_user.resetCallbacks();
			this.m_user = null;
		}

		if (this.m_chat)
			this.m_chat.disconnect();

		if (this.m_gameRouter?.m_gameMenu)
			this.m_gameRouter.m_gameMenu.destroy();

		this.m_gameRouter = null;
		if (this.m_userContainer)
			this.m_userContainer.innerHTML = "";

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
		text.style.color = "var(--white)";

		users.forEach((conn: User) => {
			const elt = new UserElement(conn, container, UserElementType.STANDARD, "user-template");
			this.addTrackListener(elt.clone, "click", () => {
				Router.Instance?.navigateTo(`/profile?username=${conn.name}`)
			});
			elt.updateHtml(conn);
		})
		container.prepend(text);
	}
}

