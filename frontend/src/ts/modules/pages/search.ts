import { ViewComponent } from 'modules/router/ViewComponent.js';
import { Router } from 'modules/router/Router.js'
import { MainUser } from 'modules/user/User.js';
import { HeaderSmall } from './HeaderSmall.js';

export class SearchView extends ViewComponent
{
	private m_user: MainUser | null = null;
	private m_container: HTMLElement | null = null;

	constructor()
	{
		super();
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
		this.m_user.onLogout(() => { Router.Instance?.navigateTo("/") })

		new HeaderSmall(this.m_user, this, "header-container");

	}

	public async disable()
	{
	}
}


