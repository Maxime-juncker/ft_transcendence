import { ViewComponent } from 'modules/router/ViewComponent.js';
import { Router } from 'modules/router/Router.js'
import { AuthSource, MainUser, User } from 'modules/user/User.js';
import { HeaderSmall } from './HeaderSmall.js';
import { UserElement, UserElementType } from 'modules/user/UserElement.js';
import * as utils from 'modules/utils/utils.js';

export class SearchView extends ViewComponent
{
	private m_users: Array<User>;
	private m_container: HTMLElement | null = null;
	private m_searchBtn: HTMLButtonElement | null = null;
	private m_query: string = "";
	private m_pageSize: number = 50;

	constructor()
	{
		super();
		this.m_users = new Array<User>();
	}

	public async init()
	{
		this.m_searchBtn = this.querySelector("#search-btn");
		if (!this.m_searchBtn)
			return;
		this.m_searchBtn.addEventListener("click", async () => {
			this.m_users = [];
			if (this.getPageSize() === 0)
			{
				this.showNoResult();
				return;
			}
			await this.searchUser(this.m_query, this.getPageSize());
			await this.refreshContainer();
		})

		const searchInput = this.querySelector("#search-input") as HTMLInputElement;
		if (searchInput)
			searchInput.value = this.m_query;
	}

	private getPageSize(): number
	{
		const pageSizeInput = this.querySelector("#page-size-input") as HTMLInputElement;
		if (!pageSizeInput)
			return 50;
		this.m_pageSize = pageSizeInput.value ? Number(pageSizeInput.value) : 50;
		return this.m_pageSize;
	}

	public async enable()
	{
		if (!MainUser.Instance)
			return;

		var query = utils.getUrlVar().get("query");
		if (query)
			this.m_query = query;
		else
		{
			console.warn("no query");
		}

		this.m_container = this.querySelector("#profile-container");

		await this.searchUser(this.m_query, this.getPageSize());
		this.refreshContainer();
		new HeaderSmall(MainUser.Instance, this, "header-container");
	}

	private async refreshContainer()
	{
		if (this.m_container === null)
		{
			console.warn("profile-container is null");
			return ;
		}

		this.m_container.innerHTML = "";
		this.m_users.forEach((user: User) => {
			if (this.m_container === null)
				return ;

			const elt = new UserElement(user, this.m_container, UserElementType.STANDARD, "user-search-template");
			elt.updateHtml(user);
		})
		if (this.m_users.length === 0)
			this.showNoResult();

		const searchRes = this.querySelector("#search-result") as HTMLElement;
		if (searchRes)
			searchRes.innerText = `${this.m_users.length}/${this.m_pageSize}`;
	}

	private async searchUser(query: string, pageSize: number)
	{
		const res = await fetch(`/api/user/search?name=${query}&page_size=${pageSize}`);
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
	
	private showNoResult()
	{
		if (!this.m_container)
			return;

		this.m_container.innerHTML = "";
		const template = this.querySelector("#no-res-template") as HTMLTemplateElement;
		if (!template)
			return;
		const clone = template.content.cloneNode(true) as HTMLElement;
		this.m_container.append(clone);
		window.dispatchEvent(new CustomEvent('pageChanged'));
	}

	public async disable()
	{
		this.m_users = new Array<User>();
		this.clearTrackListener();
	}
}


