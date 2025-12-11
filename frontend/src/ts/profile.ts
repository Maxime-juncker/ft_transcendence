import { getUserFromId, getUserFromName, MainUser, Stats, User } from "User.js";
import { UserElement } from "UserElement.js";
import { FriendManager } from "friends.js";
import * as utils from 'utils.js'
import { ViewComponent } from "ViewComponent.js";
import { Router } from "app.js";

export class ProfileView extends ViewComponent
{
	private m_main: MainUser;
	private m_user: User;

	constructor()
	{
		super();
	}

	public async enable()
	{
		this.m_main = new MainUser(this.querySelector("#user-container"));
		await this.m_main.loginSession();
		this.m_main.onLogout((user) => { Router.Instance.navigateTo("/") })
		if (this.m_main.id == -1) // user not login
			Router.Instance.navigateTo("/");

		this.m_user = this.m_main;
		if (utils.getUrlVar().has("username"))
		{
			const vars = utils.getUrlVar();
			this.m_user = await getUserFromName(vars.get("username"));
		}

		const stats: Stats = this.m_user.stats;
		new FriendManager(this.m_user, "pndg-container", "friend-container", this.m_main);
		this.setBtn();
		addMatch(this.m_user);

		const profile_extended = this.querySelector("#profile-extended");
		UserElement.setStatusColor(this.m_user, profile_extended.querySelector("#user-status"));
		(<HTMLImageElement>profile_extended.querySelector("#avatar-img")).src = this.m_user.getAvatarPath();
		(<HTMLElement>profile_extended.querySelector("#name")).textContent = this.m_user.name;
		(<HTMLElement>profile_extended.querySelector("#created_at")).innerText	= `created at: ${this.m_user.created_at.split(' ')[0]}`;
		(<HTMLElement>profile_extended.querySelector("#created_at")).innerText	= `created at: ${this.m_user.created_at.split(' ')[0]}`;

		var winrate = 0;
		if (stats.gamePlayed > 0)
			winrate = stats.gameWon > 0 ? (stats.gameWon / stats.gamePlayed) * 100 : 0;
		(<HTMLElement>this.querySelector("#game-played")).innerText		= `${stats.gamePlayed}`;
		(<HTMLElement>this.querySelector("#game-won")).innerText		= `${stats.gameWon}`;
		(<HTMLElement>this.querySelector("#winrate")).innerText			= `${stats.gamePlayed > 0 ? winrate + "%" : "n/a" }`;
		(<HTMLElement>this.querySelector("#curr-elo")).innerText		= `${stats.currElo}p`;
		(<HTMLElement>this.querySelector("#max-elo")).innerText			= `${stats.maxElo}p`;

		const userMenuContainer = this.querySelector("#user-menu-container");
		this.querySelector("#banner")?.addEventListener("click", () => Router.Instance.navigateTo("/"));
		this.querySelector("#logout_btn")?.addEventListener("click", () => this.m_main.logout());
		this.querySelector("#profile_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/profile"));
		this.querySelector("#settings_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/settings"));
		this.querySelector("#user-menu-btn").addEventListener('click', () => {
			userMenuContainer.classList.toggle("hide");
		});

	}

	private async setBtn()
	{
		replaceBtn();

		const addBtn = this.querySelector("#main-btn-friend") as HTMLElement;
		const blockBtn = this.querySelector("#main-btn-block") as HTMLElement;

		if (this.m_user.id == this.m_main.id)
		{
			addBtn.style.display = "none";
			blockBtn.style.display = "none";
			return ;
		}

		for (var [pndg, sender] of this.m_main.pndgFriends)
		{
			if (pndg.id == this.m_user.id) // set button for friends
			{
				if (sender == this.m_main.id)
				{
					// TODO: set color to orange
					addBtn.innerText = "cancel request";
					addBtn.addEventListener("click", async () => { await this.m_main.removeFriend(pndg), this.setBtn(); });
				}
				else
				{
					addBtn.innerText = "accept friend";
					addBtn.addEventListener("click", async () => { await this.m_main.acceptFriend(pndg); this.setBtn(); });
				}
				return ;
			}
		}
		for (var i = 0; i < this.m_main.friends.length; i++)
		{
			if (this.m_main.friends[i].id == this.m_user.id) // set button for friends
			{
				addBtn.innerText = "remove friend";
				addBtn.addEventListener("click", async () => { await this.m_main.removeFriend(this.m_main.friends[i]); this.setBtn(); });
				break;
			}
		}
		if (i == this.m_main.friends.length)
		{
			addBtn.innerText = "add friend";
			addBtn.addEventListener("click", async () => { await this.m_main.addFriend(this.m_user.name); this.setBtn(); });
		}
	}
}

function replaceBtn()
{
	const addBtn = this.querySelector("#main-btn-friend");
	const blockBtn = this.querySelector("#main-btn-block");

	const clone = addBtn.cloneNode(true);

	addBtn.parentNode.replaceChild(clone, addBtn);
}

async function addMatch(user: User)
{
	const histContainer = this.querySelector("#history-container");

	var response = await fetch(`/api/user/get_history_name/${user.name}`, { method : "GET" })
	const code = response.status;

	if (code == 404)
	{
		const text = document.createElement("p");

		text.innerText = "no recorded history";
		histContainer.append(text);
		return ;
	}

	if (code != 200)
		return ;

	var data = await response.json();
	for (let i = 0; i  < data.length; i ++) {
		const elt = data[i];
		const clone = await addMatchItem(user, elt);
		histContainer.append(clone);
	}
}

async function addMatchItem(user: User, json: any): Promise<HTMLElement>
{
	const template = this.querySelector("#match-template") as HTMLTemplateElement;
	const clone: HTMLElement = template.content.cloneNode(true) as HTMLElement;

	const matchup = clone.querySelector("#matchup") as HTMLElement;
	const status = clone.querySelector("#status") as HTMLElement;
	const score = clone.querySelector("#score") as HTMLElement;
	const date = clone.querySelector("#date") as HTMLElement;

	const player2Id = json.user1_id === user.id ? json.user2_id : json.user1_id;
	const player2Score = json.user1_id === user.id ? json.user2_score: json.user1_score;
	const player1Score = json.user1_id === user.id ? json.user1_score: json.user2_score;

	const player2: User = await getUserFromId(player2Id);
	matchup.innerText = `${user.name} - ${player2.name}`;
	status.innerText = `${player1Score > player2Score ? "won" : "lost" }`;
	status.style.color = `${player1Score > player2Score ? "var(--green)" : "var(--red)" }`;
	score.innerText = `${player1Score} - ${player2Score}`;
	date.innerText = json.created_at;

	return clone;
}

