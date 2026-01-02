import { MainUser } from './User.js';
import { Router } from 'app.js';
import { Leaderboard } from 'Leaderboard.js';
import { ViewComponent } from 'ViewComponent.js';

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
		// if (!this.m_profileContainer) throw new Error("profile container not found"); 

		this.addTrackListener(playBtn, "click", () => {
			if (this.m_user && this.m_user.id == -1)
				Router.Instance?.navigateTo("/login");
			else
				Router.Instance?.navigateTo("/lobby");
		});

		this.m_user = new MainUser(null);
		await this.m_user.loginSession();

		this.m_leaderboard = new Leaderboard();
		await this.m_leaderboard.Init();
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
	}
}


