import { User } from 'modules/user/User.js';
import { GameRouter } from 'modules/game/GameRouter.js';
import { getUserFromId } from 'modules/user/User.js';
import { UserElement, UserElementType } from 'modules/user/UserElement.js';
import type { Chat } from 'modules/chat/chat.js';
import { MainUser } from 'modules/user/User.js';
import * as utils from 'modules/utils/utils.js'

export class TournamentLobby
{
	private playerList: HTMLDivElement | null = null;
	private startBtn: HTMLButtonElement | null = null;
	private leaveBtn: HTMLButtonElement | null = null;
	private lobbyTitle: HTMLElement | null = null;
	
	private intervalId: number | null = null;
	private isOwner: boolean = false;
	private tournamentId: string | null = null;
	private matchListener: ((json: any) => void) | null = null;
	private matchStarted: boolean = false;

	get id(): string | null { return this.tournamentId; }

	private m_players: User[] = [];

	constructor(private router: GameRouter, private user: User, private mode: string, private chat: Chat)
	{
		this.tournamentId = mode;
		this.getElements();
		this.init();
		this.setUpEventListeners();
		this.setupMatchListener();
		this.m_players = [];
	}

	private setupMatchListener()
	{
		if (this.chat)
		{
			console.log('[TournamentLobby] Setting up match listener');
			this.matchListener = (json: any) =>
			{
				console.log('[TournamentLobby] Match notification received:', json);
				if (this.matchStarted)
				{
					console.log('[TournamentLobby] Match already started, ignoring duplicate notification');
					return;
				}

				this.matchStarted = true;
				console.log('[TournamentLobby] Navigating to game with mode: online');
				this.router.navigateTo('game', 'online');
			};
			this.chat.onGameCreated(this.matchListener);
			console.log('[TournamentLobby] Match listener registered');
		}
		else
		{
			console.error('[TournamentLobby] Chat not available, cannot set up match listener');
		}
	}

	private getElements()
	{
		const context = this.router.view || document;
		this.playerList = context.querySelector('#lobby-player-list') as HTMLDivElement;
		this.startBtn = context.querySelector('#lobby-start-btn') as HTMLButtonElement;
		this.leaveBtn = context.querySelector('#lobby-leave-btn') as HTMLButtonElement;
		this.lobbyTitle = context.querySelector('#lobby-title') as HTMLElement;
	}

	private async init()
	{
		if (!this.tournamentId)
		{
			this.router.navigateTo('tournament-menu', '');
			return ;
		}

		this.startPolling();
	}

	private startPolling()
	{
		this.fetchLobbyState();
		this.intervalId = window.setInterval(() => this.fetchLobbyState(), 1000);
	}

	private async fetchLobbyState()
	{
		try
		{
			const res = await fetch(`/api/tournament/${this.tournamentId}`);
			if (!res.ok)
			{
				if (res.status === 404)
				{
					this.router.navigateTo('tournament-menu', '');
				}

				return ;
			}

			const data = await res.json();
			if (data.status === 'started' || data.status === 'finished')
			{
				if (this.intervalId)
				{
					clearInterval(this.intervalId);
					this.intervalId = null;
				}

				return ;
			}

			this.render(data);
		}
		catch (e)
		{
			console.error('Error fetching lobby state:', e);
		}
	}

	private async render(data: any)
	{
		this.isOwner = data.ownerId === this.user.id;

		if (this.lobbyTitle)
		{
			this.lobbyTitle.innerHTML = `<span data-i18n="tournament_of"></span> <span>${data.ownerName}</span>`;
		}

		if (this.playerList)
		{
			this.m_players = [];
			for (let i = 0; i < data.players.length; i++)
			{
				const json: any = data.players[i];
				const user = await getUserFromId(json.id);
				if (!user)
				{
					continue ;
				}

				this.m_players.push(user);
			}

			this.m_players.sort((a: User, b: User) => { return Number(utils.levenshteinDistance(a.name, b.name)) })

			this.playerList.innerHTML = '';
			this.m_players.forEach((user: User) =>
			{

				if (!this.playerList)
				{
					return ;
				}

				const elt = new UserElement(user, this.playerList, UserElementType.STANDARD, 'user-game-template');
				const stats = elt.getElement("#stats");
				if (stats)
				{
					stats.style.display = "none";
				}
			})
		}

		if (this.startBtn)
		{
			this.startBtn.style.display = this.isOwner ? 'block' : 'none';
		}
	}

	private setUpEventListeners()
	{
		console.log('[TournamentLobby] Setting up event listeners');
		if (this.startBtn)
		{
			console.log('[TournamentLobby] Adding click listener to start button');
			this.startBtn.addEventListener('click', this.handleStart);
		}
		else
		{
			console.error('[TournamentLobby] Start button not found!');
		}
		
		if (this.leaveBtn)
		{
			console.log('[TournamentLobby] Adding click listener to leave button');
			this.leaveBtn.addEventListener('click', this.leaveTournament);
		}
		else
		{
			console.error('[TournamentLobby] Leave button not found!');
		}
	}

	private handleStart = async (): Promise<void> =>
	{
		if (!this.tournamentId)
		{
			console.error('[TournamentLobby] No tournament ID set');
			return ;
		}

		try
		{
			console.log('[TournamentLobby] Starting tournament:', this.tournamentId);
			const res = await fetch('/api/start-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tournamentId: this.tournamentId, token: MainUser.Instance?.token })
			});

			console.log('[TournamentLobby] Start tournament response status:', res.status);
			if (!res.ok)
			{
				const errorText = await res.text();
				console.error('Failed to start tournament:', res.status, errorText);
			}
			else
			{
				console.log('[TournamentLobby] Tournament started successfully');
			}
		}
		catch (e)
		{
			console.error('Error starting tournament:', e);
		}
	}

	private leaveTournament = async (): Promise<void> =>
	{
		if (!this.tournamentId)
		{
			return;
		}

		try
		{
			await fetch('/api/leave-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify
				({
					tournamentId: this.tournamentId,
					token: MainUser.Instance?.token
				})
			});
		}
		catch (e)
		{
			console.error('Error leaving tournament:', e);
		}
	}

	public async destroy(): Promise<void>
	{
		if (this.intervalId)
		{
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		if (this.startBtn)
		{
			this.startBtn.removeEventListener('click', this.handleStart);
		}
		
		if (this.leaveBtn)
		{
			this.leaveBtn.removeEventListener( 'click', this.leaveTournament);
		}

		if (this.router.currentPage !== 'tournament-menu')
		{
			await this.leaveTournament();
		}
	}
}
