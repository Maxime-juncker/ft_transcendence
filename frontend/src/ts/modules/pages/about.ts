import { ViewComponent } from 'modules/router/ViewComponent.js';
import { MainUser } from 'modules/user/User.js';
import { HeaderSmall } from 'modules/pages/HeaderSmall.js'
import { Router } from 'modules/router/Router.js';

export class AboutView extends ViewComponent
{
	private m_user: MainUser;

	constructor()
	{
		super();

		this.m_user = new MainUser();
	}

	public async enable()
	{
		await this.m_user.loginSession();
		if (this.m_user.id == -1) // user not login
		{
			Router.Instance?.navigateTo("/");
			return ;
		}
		this.m_user.onLogout(() => { Router.Instance?.navigateTo("/") });

		new HeaderSmall(this.m_user, this, "header-container");
	}

	public async disable()
	{
	}
}


