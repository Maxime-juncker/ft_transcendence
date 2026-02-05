import { MainUser } from 'modules/user/User.js';
import { Router } from 'modules/router/Router.js';
import { Leaderboard } from 'modules/user/Leaderboard.js';
import { ViewComponent } from 'modules/router/ViewComponent.js';
import { BlockchainBoard } from './BlockchainBoard.js';

export class StartView extends ViewComponent
{
	private m_profileContainer:	HTMLElement | null = null;
	private m_leaderboard:		Leaderboard | null = null;
	private m_playBtn:			HTMLButtonElement | null = null;
	private m_leaderboardRadio:	HTMLInputElement | null = null;
	private m_historyRadio:		HTMLInputElement | null = null;
	private m_blockChainBoard:	BlockchainBoard | null = null;
	private m_board:			HTMLElement | null = null;
	private m_boardTitle:		HTMLElement | null = null;

	constructor()
	{
		super();
	}

	public async init()
	{
		this.m_playBtn = this.querySelector("#play_btn");
		this.m_profileContainer = this.querySelector("#profile-container") as HTMLElement;
		this.m_leaderboardRadio = this.querySelector("#leaderboard-input");
		this.m_historyRadio = this.querySelector("#history-input");
		this.m_board = this.querySelector("#leaderboard-container");
		this.m_boardTitle = this.querySelector("#board-title");

		this.m_blockChainBoard = new BlockchainBoard();
		this.m_leaderboard = new Leaderboard();
		await this.m_blockChainBoard.init(this.m_board);

		if (!this.m_playBtn)
			throw new Error("play btn not found"); 

		this.m_playBtn.addEventListener( "click", () => {
			if (MainUser.Instance && MainUser.Instance.id == -1)
				Router.Instance?.navigateTo("/login");
			else
				Router.Instance?.navigateTo("/lobby");
		});

		if (this.m_leaderboardRadio)
			this.m_leaderboardRadio.addEventListener("click", () => this.radioEvent())

		if (this.m_historyRadio)
			this.m_historyRadio.addEventListener("click", () => this.radioEvent())
	}

	public async radioEvent()
	{
		const selected = document.querySelector("input[name=board-input]:checked") as HTMLInputElement;
		if (!selected)
			return;

		if (selected.value == "leaderboard")
		{
			await this.m_leaderboard?.Init();
			await this.m_leaderboard?.RefreshContainer();
			this.m_boardTitle?.setAttribute("data-i18n", "capital.leaderboard");
		}
		if (selected.value == "history")
		{
			await this.m_blockChainBoard?.refresh();
			this.m_boardTitle?.setAttribute("data-i18n", "capital.blockchain");
		}
		window.dispatchEvent(new CustomEvent('pageChanged'));

	}

	public async enable()
	{
		this.radioEvent();
	}

	public async disable()
	{
		if (!this.m_profileContainer) throw new Error("profile container not found"); 

		this.m_profileContainer.innerHTML = "";
		this.clearTrackListener();
		this.m_leaderboard?.cleanContainer();
	}
}


