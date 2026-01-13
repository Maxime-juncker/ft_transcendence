import { ViewComponent } from 'modules/router/ViewComponent.js';
import { Router } from 'modules/router/Router.js'
import { AuthSource, MainUser, User } from 'modules/user/User.js';
import { HeaderSmall } from './HeaderSmall.js';
import { UserElement, UserElementType } from 'modules/user/UserElement.js';
import * as utils from 'modules/utils/utils.js';

export class SearchView extends ViewComponent
{
	private m_user: MainUser | null = null;
	private m_users: Array<User>;
	private m_container: HTMLElement | null = null;

	constructor()
	{
		super();
		this.m_users = new Array<User>();
	}

	public async enable()
	{
		this.m_user = new MainUser();
		await this.m_user.loginSession();
		if (this.m_user.id == -1) // user not login
		{
			Router.Instance?.navigateTo("/");
			return ;
		}
		this.m_user.onLogout(() => { Router.Instance?.navigateTo("/") });

		this.m_container = this.querySelector("#profile-container");

		var query = utils.getUrlVar().get("query");
		if (query)
			await this.getAllUser(query);
		else
		{
			query = "";
			console.warn("no query");
		}

		this.refreshContainer();
		new HeaderSmall(this.m_user, this, "header-container");
		const searchInput = this.querySelector("#search-input") as HTMLInputElement;
		if (searchInput)
			searchInput.value = query;
	}

	private async refreshContainer()
	{
		if (this.m_container === null)
		{
			console.warn("profile-container is null");
			return ;
		}

		console.log("refreshing container");
		this.m_container.innerHTML = "";
		this.m_users.forEach((user: User) => {
			if (this.m_container === null)
				return ;

			const elt = new UserElement(user, this.m_container, UserElementType.STANDARD, "user-search-template");
			elt.updateHtml(user);
		})

	}

	private async getAllUser(query: string)
	{
		const res = await fetch('/api/user/get_all');
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
			if (usr.source != AuthSource.DELETED) // don't push deleted users
				this.m_users.push(usr);
		}
		this.m_users.sort((a: User, b: User) => { return Number(utils.levenshteinDistance(a.name, query) < utils.levenshteinDistance(b.name, query)); })
	}

	public async disable()
	{
		this.m_users = new Array<User>();
		this.clearTrackListener();
	}
}


