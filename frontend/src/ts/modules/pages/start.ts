import { MainUser } from 'modules/user/User.js';
import { Router } from 'modules/router/Router.js';
import { Leaderboard } from 'modules/user/Leaderboard.js';
import { ViewComponent } from 'modules/router/ViewComponent.js';

export class StartView extends ViewComponent
{
	private m_profileContainer: HTMLElement | null = null;
	private m_leaderboard: Leaderboard | null = null;

	constructor()
	{
		super();
	}

	public async enable()
	{
		const playBtn = this.querySelector("#play_btn") as HTMLElement;
		this.m_profileContainer = this.querySelector("#profile-container") as HTMLElement;

		if (!playBtn) throw new Error("play btn not found"); 

		this.addTrackListener(playBtn, "click", () => {
			if (MainUser.Instance && MainUser.Instance.id == -1)
				Router.Instance?.navigateTo("/login");
			else
				Router.Instance?.navigateTo("/lobby");
		});

		this.m_leaderboard = new Leaderboard();
		await this.m_leaderboard.Init();
		this.m_leaderboard.RefreshContainer();
	}

	public async disable()
	{
		if (!this.m_profileContainer) throw new Error("profile container not found"); 

		this.m_profileContainer.innerHTML = "";
		this.clearTrackListener();
		this.m_leaderboard?.cleanContainer();
		if (this.m_leaderboard)
			this.m_leaderboard = null;
	}
}


