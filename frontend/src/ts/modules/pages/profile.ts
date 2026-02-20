import { getUserFromId, getUserFromName, MainUser, Stats, User } from "modules/user/User.js";
import { UserElement } from "modules/user/UserElement.js";
import { FriendManager } from "modules/user/friends.js";
import * as utils from 'modules/utils/utils.js'
import { ViewComponent } from "modules/router/ViewComponent.js";
import { Router } from "modules/router/Router.js";
import { HeaderSmall } from "./HeaderSmall.js";
import { Chart, registerables } from 'chart.js';
import { ThemeController } from "./Theme.js";

Chart.register(...registerables);

export class ProfileView extends ViewComponent
{
	private m_user: User | null = null;

	constructor()
	{
		super();
	}

	public async enable()
	{
		if (!MainUser.Instance)
			return;

		await MainUser.Instance.updateFriendList();
		await MainUser.Instance.updateBlockList();

		new HeaderSmall(MainUser.Instance, this, "header-container");

		this.m_user = MainUser.Instance;
		const usernameQuery = utils.getUrlVar().get("username");
		if (usernameQuery)
			this.m_user = await getUserFromName(usernameQuery);
		if (!this.m_user || this.m_user.id == -1)
		{
			await this.setUnknowProfile();
			return;
		}

		const stats: Stats = this.m_user.stats;
		new FriendManager(this.m_user, "pndg-container", "friend-container", "blocked-container", MainUser.Instance);
		this.setBtn();
		this.addMatch(this.m_user);

		const profile_extended = this.querySelector("#profile-extended");
		if (profile_extended)
		{
			const status = profile_extended?.querySelector("#user-status") as HTMLElement;
			if (status)
				UserElement.setStatusColor(this.m_user, status);
			(<HTMLImageElement>profile_extended.querySelector("#avatar-img")).src = this.m_user.avatarPath;
			(<HTMLElement>profile_extended.querySelector("#name")).textContent = this.m_user.name;
			(<HTMLElement>profile_extended.querySelector("#created_at")).innerText	= `creation: ${this.m_user.created_at.split(' ')[0]}`;
		}

		(<HTMLElement>this.querySelector("#game-played")).innerText		= `${stats.gamePlayed}`;
		(<HTMLElement>this.querySelector("#game-won")).innerText		= `${stats.gameWon}`;
		(<HTMLElement>this.querySelector("#winrate")).innerText			= `${stats.gamePlayed > 0 ? this.m_user.winrate + "%" : "n/a" }`;
		(<HTMLElement>this.querySelector("#curr-elo")).innerText		= `${Math.ceil(stats.currElo)}p`;
		(<HTMLElement>this.querySelector("#max-elo")).innerText		= `${Math.ceil(stats.currElo)}p`;

		window.dispatchEvent(new CustomEvent('pageChanged'));
	}

	public async disable()
	{
		this.clearTrackListener();
		const userContainer = this.querySelector("#user-container") as HTMLElement;
		const historyContainer = this.querySelector("#history-container") as HTMLElement;
		if (!userContainer || !historyContainer) return;

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
		if (!MainUser.Instance || !this.m_user)
			return ;

		for (var [pndg, sender] of MainUser.Instance.pndgFriends)
		{
			if (pndg.id == this.m_user.id) // set button for friends
			{
				if (sender == MainUser.Instance.id)
				{
					addBtn.innerText = "cancel request";
					this.addTrackListener(addBtn, "click", async () => { await MainUser.Instance?.removeFriend(pndg), this.setBtn(); });
				}
				else
				{
					addBtn.innerText = "accept friend";
					this.addTrackListener(addBtn, "click", async () => { await MainUser.Instance?.acceptFriend(pndg); this.setBtn(); });
				}
				return ;
			}
		}
		for (var i = 0; i < MainUser.Instance.friends.length; i++)
		{
			if (MainUser.Instance.friends[i].id == this.m_user.id) // set button for friends
			{
				addBtn.innerText = "remove friend";
				this.addTrackListener(addBtn, "click", async () => { await MainUser.Instance?.removeFriend(MainUser.Instance.friends[i]); this.setBtn(); });
				break;
			}
		}
		if (i == MainUser.Instance.friends.length)
		{
			addBtn.innerText = "add friend";
			this.addTrackListener(addBtn, "click", async () => {
				if (!this.m_user)
					return;
				await MainUser.Instance?.addFriend(this.m_user.name); this.setBtn(); 
			});
		}
	}

	private async setBtn()
	{
		var addBtn = this.querySelector("#main-btn-friend") as HTMLButtonElement;
		var blockBtn = this.querySelector("#main-btn-block") as HTMLButtonElement;

		if (!MainUser.Instance || !this.m_user)
		{
			addBtn.style.display = "none";
			blockBtn.style.display = "none";
			return ;
		}

		await MainUser.Instance.updateSelf();
		this.replaceBtn();
		addBtn = this.querySelector("#main-btn-friend") as HTMLButtonElement;
		blockBtn = this.querySelector("#main-btn-block") as HTMLButtonElement;

		if (MainUser.Instance.id == -1 || this.m_user.id == MainUser.Instance.id)
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
		if (!MainUser.Instance || !this.m_user)
			return ;

		const clone = blockBtn.cloneNode(true) as HTMLElement;
		blockBtn.parentNode?.replaceChild(clone, blockBtn);

		var found = false;

		MainUser.Instance.blockUsr.forEach((block: User) => {
		
			if (!this.m_user) return ;

			if (block.id == this.m_user.id) // user is already blocked
			{
				clone.innerText = "unblock";
				this.addTrackListener(clone, "click", async () => {
					if (!this.m_user) return;
					await MainUser.Instance?.unblockUser(this.m_user.id); this.setBtn();
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
			await MainUser.Instance?.blockUser(this.m_user.id);
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
		eloData.set(user.created_at, 500);

		const histContainer = this.querySelector("#history-container");
		if (!histContainer)
			return ;
		histContainer.innerHTML = "";

		var response = await fetch(`/api/user/get_history_name/${user.name}`, { method : "GET" })
		const code = response.status;

		if (code == 404)
		{
			const template = this.querySelector("#no-histo-template") as HTMLTemplateElement;
			if (!template)
				return;
			const clone = template.content.cloneNode(true) as HTMLElement;
			histContainer.append(clone);
			window.dispatchEvent(new CustomEvent('pageChanged'));
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
		for (let i = 0; i  < data.length; i ++) {
			const elt = data[i];
			const clone = await this.addMatchItem(user, elt, eloData);
			histContainer.prepend(clone);
		}

		const eloValues = Array.from(eloData.values());
		const min = Math.min(...eloValues);
		const max = Math.max(...eloValues);

		new Chart(ctx, {
			type: 'line',
			data: {
				labels: Array.from(eloData.keys()),
				datasets: [{
					label: 'elo graph',
					data: eloValues,
					borderColor: ThemeController.Instance?.currentTheme?.blue,
					backgroundColor: ThemeController.Instance?.currentTheme?.blue,
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

		(<HTMLElement>this.querySelector("#max-elo")).innerText = `${Math.ceil(max)}p`;
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

		const player2Id = json.player1_id === user.id ? json.player2_id : json.player1_id;
		const player2Score = json.player1_id === user.id ? json.score2: json.score1;
		const player1Score = json.player1_id === user.id ? json.score1: json.score2;

		const user2: User | null = await getUserFromId(player2Id);
		if (!user2)
		{
			console.warn("failed to get player2");
			return clone;
		}
		const elo = user.id < user2.id ? json.user1_elo : json.user2_elo;
		const otherElo = user.id < user2.id ? json.user2_elo : json.user1_elo;
		player1.innerText = `${user.name} (${Math.ceil(elo)})`;
		player2.innerText = `${user2.name} (${Math.ceil(otherElo)})`;
		player1.addEventListener("click", () => Router.Instance?.navigateTo(`/profile?username=${user.name}`))
		player2.addEventListener("click", () => Router.Instance?.navigateTo(`/profile?username=${user2.name}`))
		status.innerText = `${player1Score > player2Score ? "won" : "lost" }`;
		status.style.color = `${player1Score > player2Score ? "var(--color-green)" : "var(--color-red)" }`;
		score.innerText = `${player1Score} - ${player2Score}`;
		date.innerText = json.played_at;
		eloData.set(json.played_at, Math.ceil(elo));

		return clone;
	}

	private async setUnknowProfile()
	{
		await this.setBtn();
		const profile_extended = this.querySelector("#profile-extended");
		if (profile_extended)
		{
			const status = profile_extended?.querySelector("#user-status") as HTMLElement;
			if (status)
				UserElement.setStatusColor(this.m_user, status);
			(<HTMLImageElement>profile_extended.querySelector("#avatar-img")).src = "/public/avatars/default.webp";
			(<HTMLElement>profile_extended.querySelector("#name")).textContent = "USER NOT FOUND";
			(<HTMLElement>profile_extended.querySelector("#created_at")).innerText	= `USER NOT FOUND`;
		}

	}

}

