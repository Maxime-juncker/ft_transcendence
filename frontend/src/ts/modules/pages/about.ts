import { ViewComponent } from 'modules/router/ViewComponent.js';

export class AboutView extends ViewComponent
{
	constructor()
	{
		super();
	}

	public async enable()
	{
		console.log("about page enable");
	}

	public async disable()
	{
	}
}


