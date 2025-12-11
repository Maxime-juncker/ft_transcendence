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
		console.log(this.children.length)
		this.addTrackListener(this.querySelector("#play_btn"), "click", () => {
			if (user.id == -1)
				Router.Instance.navigateTo("/login");
			else
				Router.Instance.navigateTo("/lobby");
		});

		var user: MainUser = new MainUser(this.querySelector("#profile-container"));
		await user.loginSession();
	}

	public async disable()
	{
		this.querySelector("#profile-container").innerHTML = "";
		this.clearTrackListener();
	}
}


