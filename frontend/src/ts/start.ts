import { MainUser } from './User.js';
import { Router } from 'app.js';
import { ViewComponent } from 'ViewComponent.js';

export class StartView extends ViewComponent
{
	constructor()
	{
		super();
	}

	public async enable()
	{
		console.log("enable")
		document.getElementById("play_btn").addEventListener('click', () => {
			if (user.id == -1)
				Router.Instance.navigateTo("/login");
			else
				Router.Instance.navigateTo("/lobby");
		});

		var user: MainUser = new MainUser(document.getElementById("profile-container"));
		await user.loginSession();
	}
}


