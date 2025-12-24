import { getUserFromId, getUserFromName, MainUser, Stats, User } from "User.js";
import { UserElement } from "UserElement.js";
import { FriendManager } from "friends.js";
import * as utils from 'utils.js'
import { ViewComponent } from "ViewComponent.js";
import { Router } from "app.js";
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export class ProfileView extends ViewComponent
{
	private m_main: MainUser | null = null;
	private m_user: User | null = null;

	constructor()
	{
		super();
	}

	public async enable()
	{
		this.m_main = new MainUser(this.querySelector("#user-container"));
		await this.m_main.loginSession();
		if (this.m_main.id == -1) // user not login
		{
			Router.Instance?.navigateTo("/");
			return ;
		}
		this.m_main.onLogout(() => { Router.Instance?.navigateTo("/") })

		this.m_user = this.m_main;
		const usernameQuery = utils.getUrlVar().get("username");
		if (usernameQuery)
			this.m_user = await getUserFromName(usernameQuery);
		if (!this.m_user) return;

		const stats: Stats = this.m_user.stats;
		new FriendManager(this.m_user, "pndg-container", "friend-container", "blocked-container", this.m_main);
		this.setBtn();
		this.addMatch(this.m_user);

		const profile_extended = this.querySelector("#profile-extended");
		if (profile_extended)
		{
			const status = profile_extended?.querySelector("#user-status") as HTMLElement;
			if (status)
				UserElement.setStatusColor(this.m_user, status);
			(<HTMLImageElement>profile_extended.querySelector("#avatar-img")).src = this.m_user.getAvatarPath();
			(<HTMLElement>profile_extended.querySelector("#name")).textContent = this.m_user.name;
			(<HTMLElement>profile_extended.querySelector("#created_at")).innerText	= `created at: ${this.m_user.created_at.split(' ')[0]}`;
		}

		var winrate = 0;
		if (stats.gamePlayed > 0)
			winrate = stats.gameWon > 0 ? (stats.gameWon / stats.gamePlayed) * 100 : 0;
		(<HTMLElement>this.querySelector("#game-played")).innerText		= `${stats.gamePlayed}`;
		(<HTMLElement>this.querySelector("#game-won")).innerText		= `${stats.gameWon}`;
		(<HTMLElement>this.querySelector("#winrate")).innerText			= `${stats.gamePlayed > 0 ? Math.round(winrate) + "%" : "n/a" }`;
		(<HTMLElement>this.querySelector("#curr-elo")).innerText		= `${stats.currElo}p`;

		const userMenuContainer = this.querySelector("#user-menu-container");
		this.addTrackListener(this.querySelector("#banner"), "click", () => Router.Instance?.navigateTo("/"));
		this.addTrackListener(this.querySelector("#logout_btn"), "click", () => this.m_main?.logout());
		this.addTrackListener(this.querySelector("#profile_btn"), "click", () => Router.Instance?.navigateTo("/profile"));
		this.addTrackListener(this.querySelector("#settings_btn"), "click", () => Router.Instance?.navigateTo("/settings"));
		this.addTrackListener(this.querySelector("#user-menu-btn"), 'click', () => {
			userMenuContainer?.classList.toggle("hide");
		});
	}

	public async disable()
	{
		const userContainer = this.querySelector("#user-container") as HTMLElement;
		const historyContainer = this.querySelector("#history-container") as HTMLElement;
		if (!userContainer || !historyContainer) return;

		if (this.m_main)
		{
			this.m_main.resetCallbacks();
			this.m_main = null;
		}

		var ctx = document.getElementById('eloEvo') as HTMLCanvasElement;
		if (!ctx)
		{
			console.warn("no chart found")
			return;
		}
		const clone = ctx.cloneNode(true) as HTMLCanvasElement;;
		ctx.parentNode?.replaceChild(clone, ctx);

		userContainer.innerHTML = "";
		historyContainer.innerHTML = "";
	}

	private async setFriendBtn(addBtn: HTMLButtonElement)
	{
		if (!this.m_main || !this.m_user)
			return ;

		for (var [pndg, sender] of this.m_main.pndgFriends)
		{
			if (pndg.id == this.m_user.id) // set button for friends
			{
				if (sender == this.m_main.id)
				{
					// TODO: set color to orange
					addBtn.innerText = "cancel request";
					this.addTrackListener(addBtn, "click", async () => { await this.m_main?.removeFriend(pndg), this.setBtn(); });
				}
				else
				{
					addBtn.innerText = "accept friend";
					this.addTrackListener(addBtn, "click", async () => { await this.m_main?.acceptFriend(pndg); this.setBtn(); });
				}
				return ;
			}
		}
		for (var i = 0; i < this.m_main.friends.length; i++)
		{
			if (this.m_main.friends[i].id == this.m_user.id) // set button for friends
			{
				addBtn.innerText = "remove friend";
				this.addTrackListener(addBtn, "click", async () => { await this.m_main?.removeFriend(this.m_main.friends[i]); this.setBtn(); });
				break;
			}
		}
		if (i == this.m_main.friends.length)
		{
			addBtn.innerText = "add friend";
			this.addTrackListener(addBtn, "click", async () => {
				if (!this.m_user) return;
				await this.m_main?.addFriend(this.m_user.name); this.setBtn(); 
			});
		}
	}

	private async setBtn()
	{
		if (!this.m_main || !this.m_user)
			return ;

		await this.m_main.updateSelf();
		this.replaceBtn();

		const addBtn = this.querySelector("#main-btn-friend") as HTMLButtonElement;
		const blockBtn = this.querySelector("#main-btn-block") as HTMLButtonElement;

		if (this.m_user.id == this.m_main.id)
		{
			addBtn.style.display = "none";
			blockBtn.style.display = "none";
			return ;
		}
		
		addBtn.style.display = "block";
		blockBtn.style.display = "block";

		await this.setFriendBtn(addBtn);
		await this.setBlockBtn(blockBtn);
	}

	private async setBlockBtn(blockBtn: HTMLButtonElement)
	{
		if (!this.m_main || !this.m_user)
			return ;

		const clone = blockBtn.cloneNode(true) as HTMLElement;
		blockBtn.parentNode?.replaceChild(clone, blockBtn);

		var found = false;

		this.m_main.blockUsr.forEach((block: User) => {
		
			if (!this.m_user) return ;

			if (block.id == this.m_user.id) // user is already blocked
			{
				clone.innerText = "unblock";
				this.addTrackListener(clone, "click", async () => {
					if (!this.m_user) return;
					await this.m_main?.unblockUser(this.m_user.id); this.setBtn();
				});
				found = true;
				return ;
			}
		})
		if (found)
			return;
		clone.innerText = "block";
		this.addTrackListener(clone, "click", async () => {
			if (!this.m_user) return;
			await this.m_main?.blockUser(this.m_user.id);
			await this.setBtn();
		});
	}
	

	private replaceBtn()
	{
		const addBtn = this.querySelector("#main-btn-friend");
		const blockBtn = this.querySelector("#main-btn-block");
		if (!addBtn || !blockBtn)
			return ;

		var clone = addBtn.cloneNode(true);
		addBtn.parentNode?.replaceChild(clone, addBtn);

		clone = blockBtn.cloneNode(true);
		blockBtn.parentNode?.replaceChild(clone, blockBtn);
	}

	private async addMatch(user: User)
	{
		const eloData = new Map<string, number>()
		eloData.set(user.created_at, 1000);

		const histContainer = this.querySelector("#history-container");
		if (!histContainer)
			return ;
		histContainer.innerHTML = "";

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
	
		var ctx = document.getElementById('eloEvo') as HTMLCanvasElement;
		if (!ctx)
		{
			console.warn("no chart found")
			return;
		}

		var data = await response.json();
		console.log(data)
		for (let i = 0; i  < data.length; i ++) {
			const elt = data[i];
			const clone = await this.addMatchItem(user, elt, eloData);
			histContainer.prepend(clone);
		}

		const eloValues = Array.from(eloData.values());
		const min = Math.min(...eloValues);
		const max = Math.max(...eloValues);

		new Chart(ctx, {
			type: 'line',                                   // chart type
			data: {
				labels: Array.from(eloData.keys()),
				datasets: [{
					label: 'elo graph',
					data: eloValues,
					borderColor: 'rgba(75, 192, 192, 1)',
					backgroundColor: 'rgba(75, 192, 192, 0.2)',
					// stepped: true,
					tension: 0.0
				}]
			},
			options: {
				responsive: true,
				plugins: {
					tooltip: {
						mode: 'index',
						intersect: false
					},
					title: {
						display: true,
						text: 'elo graph'
					},
				},
				hover: {
					mode: 'index',
					intersect: false
				},
				scales: {
					y: {
						min: min
					},
					x: { display: false }
				}
			}
		});

		(<HTMLElement>this.querySelector("#max-elo")).innerText = `${max}p`;
	}

	private async addMatchItem(user: User, json: any, eloData: Map<string, number>): Promise<HTMLElement>
	{
		const template = this.querySelector("#match-template") as HTMLTemplateElement;
		const clone: HTMLElement = template.content.cloneNode(true) as HTMLElement;

		const player1 = clone.querySelector("#player1") as HTMLElement;
		const player2 = clone.querySelector("#player2") as HTMLElement;
		const status = clone.querySelector("#status") as HTMLElement;
		const score = clone.querySelector("#score") as HTMLElement;
		const date = clone.querySelector("#date") as HTMLElement;
		if (!player1 || !player2 || !status || !score || !date)
		{
			console.warn("failed to retreive one or more element of match template");
			return clone;
		}

		const player2Id = json.user1_id === user.id ? json.user2_id : json.user1_id;
		const player2Score = json.user1_id === user.id ? json.user2_score: json.user1_score;
		const player1Score = json.user1_id === user.id ? json.user1_score: json.user2_score;

		const user2: User | null = await getUserFromId(player2Id);
		if (!user2)
		{
			console.warn("failed to get player2");
			return clone;
		}
		const elo = user.id < user2.id ? json.user1_elo : json.user2_elo;
		const otherElo = user.id < user2.id ? json.user2_elo : json.user1_elo;
		player1.innerText = `${user.name} (${elo})`;
		player2.innerText = `${user2.name} (${otherElo})`;
		player1.addEventListener("click", () => Router.Instance?.navigateTo(`/profile?username=${user.name}`))
		player2.addEventListener("click", () => Router.Instance?.navigateTo(`/profile?username=${user2.name}`))
		status.innerText = `${player1Score > player2Score ? "won" : "lost" }`;
		status.style.color = `${player1Score > player2Score ? "var(--color-green)" : "var(--color-red)" }`;
		score.innerText = `${player1Score} - ${player2Score}`;
		date.innerText = json.created_at;
		eloData.set(json.created_at, elo);

		return clone;
	}

}

