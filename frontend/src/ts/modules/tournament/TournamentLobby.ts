import { User } from 'modules/user/User.js';
import { GameRouter } from 'modules/game/GameRouter.js';
import { getUserFromId } from 'modules/user/User.js';
import { UserElement, UserElementType } from 'modules/user/UserElement.js';
import type { Chat } from 'modules/chat/chat.js';
import { MainUser } from 'modules/user/User.js';
import * as utils from 'modules/utils/utils.js'
import { Router } from 'modules/router/Router.js';
import { LobbyView } from 'modules/pages/lobby.js';

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
	private isLeaving: boolean = false;
	private destroyed: boolean = false;
	private ownerName: string = '';
	private lobby:		LobbyView;

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
		this.lobby = Router.Instance?.activeView as LobbyView;

		this.lobby.loadingIndicator?.startLoading();
	}

	private setupMatchListener()
	{
		if (this.chat)
		{
			console.log('[TournamentLobby] Setting up match listener');
			this.matchListener = (json: any) =>
			{
				console.log('[TournamentLobby] Match notification received:', json);
				this.matchStarted = true;
				this.router.currentTournamentId = this.tournamentId;
			};

			this.chat.onGameCreated(this.matchListener);
			console.log('[TournamentLobby] Match listener registered');
		}
		else
		{
			console.error('[TournamentLobby] Chat not available, cannot set up match listener');
		}
	}

	private enableBtn(btn: HTMLButtonElement)
	{
		btn.classList.remove("btn-disable");
		btn.disabled = false;
	}

	private disableBtn(btn: HTMLButtonElement)
	{
		btn.classList.add("btn-disable");
		btn.disabled = true;
	}

	private getElements()
	{
		const context = this.router.view || document;
		this.playerList = context.querySelector('#lobby-player-list') as HTMLDivElement;
		this.startBtn = context.querySelector('#lobby-start-btn') as HTMLButtonElement;
		this.leaveBtn = context.querySelector('#lobby-leave-btn') as HTMLButtonElement;
		this.lobbyTitle = context.querySelector('#lobby-title') as HTMLElement;

		this.disableBtn(this.startBtn);
		this.disableBtn(this.leaveBtn);
	}

	private async init()
	{
		if (!MainUser.Instance)
		{
			console.error('[TournamentLobby] No user found');
			this.router.navigateTo('tournament-menu', '');
			return ;
		}

		if (!this.tournamentId || this.tournamentId === "")
		{
			console.log('[TournamentLobby] Creating new tournament');
			this.wss = new WebSocket(`wss://${location.host}/api/tournament/create`);
		}
		else
		{
			console.log('[TournamentLobby] Joining tournament:', this.tournamentId);
			this.wss = new WebSocket(`wss://${location.host}/api/tournament/join?lobbyId=${encodeURIComponent(this.tournamentId)}`);
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
					this.isLeaving = true;
					this.router.navigateTo('tournament-menu', '');
				}
				else if (data.message === "GAME_STARTING")
				{
					console.log('[TournamentLobby] Game is starting, setting matchStarted flag');
					this.matchStarted = true;
				}
				else if (data.message === "LOBBY_CLOSED")
				{
					console.log('[TournamentLobby] Lobby closed:', data.reason);
					alert(`Lobby closed: ${data.reason || 'Owner left'}`);
					this.isLeaving = true;
					this.router.navigateTo('tournament-menu', '');
				}
				else if (data.message === "created" && data.lobbyId)
				{
					console.log('[TournamentLobby] Tournament created with ID:', data.lobbyId);
					this.tournamentId = data.lobbyId;
					this.lobby.loadingIndicator?.stopLoading();
					await this.render(data);

					if (this.startBtn && this.leaveBtn)
					{
						this.enableBtn(this.startBtn);
						this.enableBtn(this.leaveBtn);
					}
					else
					{
						console.warn("missing btn");
					}
				}
				else if (data.message === "UPDATE")
				{
					this.lobby.loadingIndicator?.stopLoading();
					if (this.startBtn && this.leaveBtn)
					{
						this.enableBtn(this.startBtn);
						this.enableBtn(this.leaveBtn);
					}
					else
					{
						console.warn("missing btn");
					}
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
			this.isLeaving = true;
			this.router.navigateTo('tournament-menu', '');
		};

		this.wss.onclose = (event: CloseEvent) =>
		{
			console.log('[TournamentLobby] WebSocket connection closed:', event);
			if (!this.matchStarted && !this.isLeaving)
			{
				this.router.navigateTo('tournament-menu', '');
			}
		};
	}

	private async render(data: any)
	{
		if (!data || !data.players || !data.ownerId || !data.ownerName)
		{
			console.error('[TournamentLobby] Invalid render data:', data);
			return;
		}

		this.isOwner = data.ownerId === this.user.id;
		this.ownerName = data.ownerName;

		if (this.lobbyTitle)
		{
			this.lobbyTitle.innerHTML = `<span data-i18n="tournament_of"></span> <span id="lobby-owner-name">${this.ownerName}</span>`;
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
			this.leaveBtn.addEventListener('click', this.leaveRedirect);
		}
		else
		{
			console.error('[TournamentLobby] Leave button not found!');
		}
	}

	private calculateNbBot(size: number): number
	{
		return (size === 1) ? 1 : Math.pow(2, Math.ceil(Math.log2(size))) - size;
	}

	private handleStart = async (): Promise<void> =>
	{
		if (!this.tournamentId)
		{
			console.error('[TournamentLobby] No tournament ID set');
			return ;
		}

		const nbBot = this.calculateNbBot(this.m_players.length);
		if (nbBot > 0)
		{
			const confirmed = confirm(`${nbBot} bot(s) will be added to fill the bracket. Start anyway?`);
			if (!confirmed)
			{
				return;
			}
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

	private leaveRedirect = async (): Promise<void> =>
	{
		await this.leaveTournament();
		this.router.navigateTo('tournament-menu', '');
	}

	private leaveTournament = async (): Promise<void> =>
	{
		if (!this.tournamentId || this.tournamentId === "" || this.isLeaving)
		{
			return;
		}

		this.isLeaving = true;

		try
		{
			const res = await fetch('/api/tournament/leave',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MainUser.Instance?.token}` },
				body: JSON.stringify ({ lobbyId: this.tournamentId })
			});

			if (!res.ok)
			{
				console.error('Failed to leave tournament:', await res.text());
			}
		}
		catch (e)
		{
			console.error('Error leaving tournament:', e);
		}
	}

	public async destroy(): Promise<void>
	{
		if (this.destroyed)
		{
			return ;
		}
		this.destroyed = true;

		if (this.wss)
		{
			this.wss.onmessage = null;
			this.wss.onclose = null;
			this.wss.onerror = null;
			if (this.wss.readyState === WebSocket.OPEN)
			{
				this.wss.close();
			}
			this.wss = null;
		}

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
			this.leaveBtn.removeEventListener('click', this.leaveRedirect);
		}

		if (this.matchListener && this.chat)
		{
			this.chat.removeOnGameCreated(this.matchListener);
		}

		if (!this.isLeaving && !this.matchStarted)
		{
			await this.leaveTournament();
		}
	}
}
