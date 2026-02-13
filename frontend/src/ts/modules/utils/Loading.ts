import { Router } from 'modules/router/Router.js';
import { ViewComponent } from 'modules/router/ViewComponent.js';
import * as utils from 'modules/utils/utils.js';

export class LoadingIndicator
{
	private m_loadingIndicator: HTMLElement | null = null;
	private m_isLoading = false;

	constructor(view: ViewComponent, elementName: string = "loading-indicator")
	{
		this.m_loadingIndicator = view.querySelector(`#${elementName}`);
		if (!this.m_loadingIndicator)
			console.warn("can't find loading indictor");
		this.m_isLoading = false;

		this.stopLoading();
	}

	public async startLoading()
	{
		this.m_isLoading = true;
		if (!this.m_loadingIndicator)
		{
			console.warn("can't find loading indictor");
			return;
		}

		this.m_loadingIndicator.style.display = "flex";
		const frames = ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'];
		var currFrame = 0;
		const wheel = this.m_loadingIndicator.querySelector("#loading-wheel") as HTMLElement;
		if (!wheel)
			return;

		while (this.m_isLoading)
		{
			wheel.innerText = frames[currFrame % (frames.length)];
			currFrame++;
			await utils.sleep(60);
		}
	}

	public stopLoading()
	{
		this.m_isLoading = false;
		if (!this.m_loadingIndicator)
		{
			console.warn("can't find loading indictor");
			return;
		}

		this.m_loadingIndicator.style.display = "none";
	}
}
