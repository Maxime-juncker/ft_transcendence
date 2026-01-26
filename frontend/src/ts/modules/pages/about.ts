import { ViewComponent } from 'modules/router/ViewComponent.js';
import { MainUser } from 'modules/user/User.js';
import { HeaderSmall } from 'modules/pages/HeaderSmall.js'

export class AboutView extends ViewComponent
{
	constructor()
	{
		super();
	}

	public async init()
	{
		const abidolet = this.querySelector("#abidolet");
		const sithomas = this.querySelector("#sithomas");
		const ygille = this.querySelector("#ygille");
		const mjuncker = this.querySelector("#mjuncker");
		if (!abidolet || !sithomas || !ygille || !mjuncker)
		{
			console.warn("missing credit div");
			return ;
		}

		abidolet.addEventListener("click", () => window.location.href = "https://github.com/abidolet/");
		sithomas.addEventListener("click", () => window.location.href = "https://github.com/Sths147");
		ygille.addEventListener("click", () => window.location.href = "https://github.com/Bluesmoothie/");
		mjuncker.addEventListener("click", () => window.location.href = "https://github.com/Maxime-juncker");
	}

	public async enable()
	{
		if (!MainUser.Instance)
			return;
		new HeaderSmall(MainUser.Instance, this, "header-container");
	}

	public async disable()
	{
	}
}


