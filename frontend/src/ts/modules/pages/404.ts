import { Router } from 'modules/router/Router.js';
import { ViewComponent } from 'modules/router/ViewComponent.js';

export class NotFoundView extends ViewComponent
{
	private m_profileContainer: HTMLElement | null = null;

	constructor()
	{
		super();
	}

	public async enable()
	{
		this.addTrackListener(this.querySelector("#homepage-btn"), "click", () => { Router.Instance?.navigateTo("/") })
	}

	public async disable()
	{
		this.clearTrackListener();
	}
}


