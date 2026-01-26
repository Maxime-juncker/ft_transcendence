import { User } from "modules/user/User.js";
import { UserElement, UserElementType } from "modules/user/UserElement.js";
import { Router } from "modules/router/Router.js";

export class Leaderboard
{
	private m_users: User[] = [];
	private m_container: HTMLElement | null = null;
	private m_LeaderboardSize: number = 5; // max number on leaderboard

	constructor(containerName = "leaderboard-container")
	{
		this.m_container = Router.getElementById(containerName) as HTMLElement;
		if (!this.m_container)
			return ;
	}

	public async Init()
	{
		const res = await fetch('/api/user/get_best_elo');
		const data = await res.json();
		if (res.status != 200)
		{
			console.warn(res.status, data)
			return ;
		}
		for (let i = 0; i < data.length; i++)
		{
			const element = data[i];

			const usr: User = new User();
			usr.setUser(element.id, element.name, "", element.avatar, element.status);
			await usr.updateSelf()
			this.m_users.push(usr);
		}
	}

	public async cleanContainer()
	{
		if (!this.m_container)
			return ;

		this.m_container.innerHTML = "";
	}

	public async RefreshContainer()
	{
		if (!this.m_container)
			return ;
		this.cleanContainer();
		let max = this.m_users.length < this.m_LeaderboardSize ? this.m_users.length : this.m_LeaderboardSize;
		for (let i = 0; i < max; i++)
		{
			const user = this.m_users[i];
			if (!this.m_container)
			{
				console.warn("no container");
				return ;
			}
			await user.updateSelf();
			const elt = new UserElement(user, this.m_container, UserElementType.STANDARD, "user-leaderboard-template");
			// elt.getElement("#profile")?.addEventListener("click", () => { Router.Instance?.navigateTo(`/profile?username=${user.name}`) });
			const elo = elt.getElement("#elo");
			const winrate = elt.getElement("#winrate");
			if (elo)
				elo.innerText = `elo: ${user.elo}p`;
			if (winrate)
			{
				winrate.innerHTML = "";
  			const prefix = document.createElement("span");
  			prefix.innerText= "W/R: ";
  			winrate.appendChild(prefix);

  			const valueSpan = document.createElement("span");
  			valueSpan.textContent = user.gamePlayed > 0 ? `${user.winrate}%` : "";
  			winrate.appendChild(valueSpan);

  			if (user.gamePlayed === 0) {
    			const noData = document.createElement("span");
    			noData.setAttribute('data-i18n', "no_data");
    			winrate.appendChild(noData);
				}
			window.dispatchEvent(new CustomEvent('pageChanged'));
			}

			const rank = elt.getElement("#ranking");
			if (rank)
			{
				switch (i) {
					case 0:
						rank.style.color = "var(--color-red)";
						if (rank.parentElement)
							rank.parentElement.style.borderColor = "var(--color-red)";
						break;

					case 1:
						rank.style.color = "var(--color-yellow)";
						if (rank.parentElement)
							rank.parentElement.style.borderColor = "var(--color-yellow)";
						break;

					case 2:
						rank.style.color = "var(--color-green)";
						if (rank.parentElement)
							rank.parentElement.style.borderColor = "var(--color-green)";
						break;
					default:
						break;
				}
				rank.innerText = `${i + 1}`;
			}
		}
	}
}
