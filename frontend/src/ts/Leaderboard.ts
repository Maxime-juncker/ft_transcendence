import { User } from "User.js";
import { UserElement, UserElementType } from "UserElement.js";
import { Router } from "app.js";

export class Leaderboard
{
	private m_users: User[] = [];
	private m_container: HTMLElement | null = null;

	constructor(containerName = "leaderboard-container")
	{
		this.m_container = Router.getElementById(containerName) as HTMLElement;
		if (!this.m_container)
			return ;
	}

	public async Init()
	{
		const res = await fetch('/api/user/get_all');
		const data = await res.json();
		if (res.status != 200)
		{
			console.warn(res.status, data)
			return ;
		}
		console.log(data);
		data.forEach((element: any) => {
			const usr: User = new User();
			usr.setUser(element.id, element.name, "", element.avatar, element.status, element.elo);
			this.m_users.push(usr);
		});
		this.m_users.sort((a: User, b: User) => { return Number(a.elo < b.elo) })
	}

	public RefreshContainer()
	{
		if (!this.m_container)
			return ;

		this.m_container.innerHTML = "";
		for (let i = 0; i < this.m_users.length; i++)
		{
			const user = this.m_users[i];
			if (!this.m_container)
			{
				console.warn("no container");
				return ;
			}
			const elt = new UserElement(user, this.m_container, UserElementType.STANDARD, "user-leaderboard-template");
			elt.getElement("#profile")?.addEventListener("click", () => { Router.Instance?.navigateTo(`/profile?username=${user.name}`) });
			const rank = elt.getElement("#ranking");
			if (rank)
				rank.innerText = `${i + 1}`;
		}
	}
}
