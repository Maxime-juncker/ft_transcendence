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
	private wss: WebSocket | null = null;

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

		const token = MainUser.Instance?.token;
		if (!token)
		{
			console.error('[TournamentLobby] No token found for main user');
			this.router.navigateTo('tournament-menu', '');
			return ;
		}

		if (this.tournamentId != "")
		{
			this.wss = new WebSocket(`wss://${location.host}/api/tournament/create?token=${encodeURIComponent(token)}`);
		}
		else
		{
			this.wss = new WebSocket(`wss://${location.host}/api/tournament/join?token=${encodeURIComponent(token)}&lobbyId=${encodeURIComponent(this.tournamentId)}`);
		}

		this.wss.onopen = () =>
		{
			console.log('[TournamentLobby] WebSocket connection established');
		};

		this.wss.onmessage = async (event: MessageEvent) =>
		{
			console.log('[TournamentLobby] WebSocket message received:', event.data);
			try
			{
				const data = JSON.parse(event.data);
				if (data.error)
				{
					console.error('[TournamentLobby] Error from server:', data.error);
					alert(`Error: ${data.error}`);
					this.router.navigateTo('tournament-menu', '');
				}
				else
				{
					await this.render(data);
				}
			}
			catch (e)
			{
				console.error('[TournamentLobby] Failed to parse WebSocket message:', e);
			}
		};

		this.wss.onerror = (event: Event) =>
		{
			console.error('[TournamentLobby] WebSocket error:', event);
			this.router.navigateTo('tournament-menu', '');
		};

		this.wss.onclose = (event: CloseEvent) =>
		{
			console.log('[TournamentLobby] WebSocket connection closed:', event);
			if (!this.matchStarted)
			{
				this.router.navigateTo('tournament-menu', '');
			}
		};
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
			const res = await fetch('/api/tournament/start',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MainUser.Instance?.token}` },
				body: JSON.stringify({ lobbyId: this.tournamentId })
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
			await fetch('/api/tournament/leave',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MainUser.Instance?.token}` },
				body: JSON.stringify ({ lobbyId: this.tournamentId })
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
