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
	private m_user:	MainUser = null;
	private m_chat:	Chat = null;
	private state:	ListState = ListState.HIDDEN;

	constructor()
	{
		super();
	}

	public async enable()
	{
		this.querySelector
		this.m_user = new MainUser(this.querySelector("#user-container"));

		await this.m_user.loginSession();

		if (this.m_user.id == -1)
			Router.Instance.navigateTo("/");
		this.m_user.onLogout((user) => { Router.Instance.navigateTo("/"); })

		const chatInput: HTMLInputElement = this.querySelector("#chat-in") as HTMLInputElement;
		this.m_chat = new Chat(this.m_user, this.querySelector("#chat-out"), chatInput);
		this.m_chat.onConnRefresh((conns: User[]) => this.fillUserList(conns));
		new GameRouter(this.m_user, this.m_chat, this);

		const userMenuContainer = this.querySelector("#user-menu-container");

		this.querySelector("#user-list-btn").addEventListener('click', () => {
			this.showListContainer(ListState.USER, this.m_chat, this.m_user);
		});
		this.querySelector("#friend-list-btn").addEventListener('click', () => {
			this.showListContainer(ListState.FRIEND, this.m_chat, this.m_user);
		});
		this.querySelector("#user-menu-btn").addEventListener('click', () => {
			userMenuContainer.classList.toggle("hide");
		});

		this.querySelector("#banner")?.addEventListener("click", () => Router.Instance.navigateTo("/"));
		this.querySelector("#logout_btn")?.addEventListener("click", () => this.m_user.logout());
		this.querySelector("#profile_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/profile"));
		this.querySelector("#settings_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/settings"));
	}

	public async disable()
	{
		// TODO: keep chat socket online when going to settings / profile
		this.m_user.removeFromQueue();
		this.m_chat.disconnect();
	}

	private showListContainer(newState: ListState, chat: Chat, user: User)
	{
		const userListParent = this.querySelector("#user-list-parent");
		
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

		if (this.state == ListState.USER)
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
			elt.clone.addEventListener("click", () => {
				Router.Instance.navigateTo(`/profile?username=${conn.name}`)
			});
			elt.updateHtml(conn);
		})
		container.prepend(text);
	}
}

