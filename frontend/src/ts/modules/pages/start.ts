import { MainUser } from 'modules/user/User.js';
import { Router } from 'modules/router/Router.js';
import { Leaderboard } from 'modules/user/Leaderboard.js';
import { ViewComponent } from 'modules/router/ViewComponent.js';

// TODO quand on vas sur le profile d'un mec puis que on revien au start, des event listener sont pas clear et ca pete des trucs

export class StartView extends ViewComponent
{
	private m_profileContainer: HTMLElement | null = null;
	private m_user: MainUser | null = null;
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
			if (this.m_user && this.m_user.id == -1)
				Router.Instance?.navigateTo("/login");
			else
				Router.Instance?.navigateTo("/lobby");
		});

		this.m_user = new MainUser();
		await this.m_user.loginSession();

		this.m_leaderboard = new Leaderboard();
		await this.m_leaderboard.Init();
		// console.error("enabling start.ts");
		this.m_leaderboard.RefreshContainer();
	}

	public async disable()
	{
		if (!this.m_profileContainer) throw new Error("profile container not found"); 

		if (this.m_user)
		{
			this.m_user.resetCallbacks();
			this.m_user = null;
		}

		this.m_profileContainer.innerHTML = "";
		this.clearTrackListener();
		this.m_leaderboard?.cleanContainer();
		if (this.m_leaderboard)
			this.m_leaderboard = null;
	}
}


