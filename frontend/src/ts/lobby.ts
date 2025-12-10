import { MainUser, User } from "User.js";
import { UserElement, UserElementType } from "UserElement.js";
import { Chat } from "modules/chat.js";
import { GameRouter } from "router.js";
import { Router } from "app.js";
import { ViewComponent } from "ViewComponent.js";

export class LobbyView extends ViewComponent
{
	private m_user:	MainUser;
	private m_chat:	Chat;
	constructor()
	{
		super();
	}

	public async enable()
	{
		console.warn("enabling lobby view");
		this.m_user = new MainUser(document.getElementById("user-container"));

		await this.m_user.loginSession();

		if (this.m_user.id == -1)
			Router.Instance.navigateTo("/");
		this.m_user.onLogout((user) => { Router.Instance.navigateTo("/"); })

		const chatInput: HTMLInputElement = document.getElementById("chat-in") as HTMLInputElement;
		this.m_chat = new Chat(this.m_user, document.getElementById("chat-out"), chatInput);
		this.m_chat.onConnRefresh(fillUserList);
		new GameRouter(this.m_user, this.m_chat);

		const userMenuContainer = document.getElementById("user-menu-container");

		document.getElementById("user-list-btn").addEventListener('click', () => {
			showListContainer(ListState.USER, this.m_chat, this.m_user);
		});
		document.getElementById("friend-list-btn").addEventListener('click', () => {
			showListContainer(ListState.FRIEND, this.m_chat, this.m_user);
		});
		document.getElementById("user-menu-btn").addEventListener('click', () => {
			userMenuContainer.classList.toggle("hide");
		});

		document.getElementById("banner")?.addEventListener("click", () => Router.Instance.navigateTo("/"));
		document.getElementById("logout_btn")?.addEventListener("click", () => this.m_user.logout());
		document.getElementById("profile_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/profile"));
		document.getElementById("settings_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/settings"));
	}

	public async disable()
	{
		// TODO: keep chat socket online when going to settings / profile
		this.m_chat.disconnect();
	}
}

enum ListState
{
	HIDDEN,
	FRIEND,
	USER,
}

var state = ListState.HIDDEN;
function showListContainer(newState: ListState, chat: Chat, user: User)
{
	const userListParent = document.getElementById("user-list-parent");
	
	if (state != ListState.HIDDEN && state == newState)
	{
		userListParent.classList.add("hide");
		state = ListState.HIDDEN;
	}
	else
	{
		state = newState;
		userListParent.classList.remove("hide");
	}

	if (state == ListState.USER)
		fillUserList(chat.conns);
	if (state == ListState.FRIEND)
		fillUserList(user.friends);
}

function fillUserList(users: User[])
{
	const container = document.getElementById("user-list-container");
	container.innerHTML = "";

	const text = document.createElement("p");
	text.innerText = state == ListState.USER ? "user list" : "friends list";
	text.style.color = "var(--white)";

	users.forEach((conn: User) => {
		const elt = new UserElement(conn, container, UserElementType.STANDARD, "user-template");
		elt.clone.addEventListener("click", () => {
			console.log(`${window.location.origin}/profile?username=${conn.name}`);
			Router.Instance.navigateTo(`/profile?username=${conn.name}`)
		});
		elt.updateHtml(conn);
	})
	container.prepend(text);
}
