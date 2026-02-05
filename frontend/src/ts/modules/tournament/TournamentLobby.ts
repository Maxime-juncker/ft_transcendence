import { User } from 'modules/user/User.js';
import { GameRouter } from 'modules/game/GameRouter.js';
import { Router } from 'modules/router/Router.js';
import type { Chat } from 'modules/chat/chat.js';

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

	constructor(private router: GameRouter, private user: User, private mode: string, private chat: Chat)
	{
		this.tournamentId = mode;
		this.getElements();
		this.init();
		this.setUpEventListeners();
		this.setupMatchListener();
	}

	private setupMatchListener()
	{
		if (this.chat)
		{
			this.matchListener = (json: any) =>
			{
				if (this.matchStarted)
				{
					console.log('[TournamentLobby] Match already started, ignoring duplicate notification');
					return;
				}

				this.matchStarted = true;
				this.router.navigateTo('game', 'online');
			};
			this.chat.onGameCreated(this.matchListener);
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

	private render(data: any)
	{
		this.isOwner = data.ownerId === this.user.id;
		
		if (this.lobbyTitle)
		{
			this.lobbyTitle.innerText = data.ownerName + "'s Tournament";
		}

		if (this.playerList)
		{
			this.playerList.innerHTML = '';
			data.players?.forEach((p: any) =>
			{
				const playerDiv = document.createElement('div');
				playerDiv.className = 'text-white bg-dark p-2 rounded';
				playerDiv.textContent = p.name;
				this.playerList!.appendChild(playerDiv);
			});
		}

		if (this.startBtn)
		{
			this.startBtn.style.display = this.isOwner ? 'block' : 'none';
		}
	}

	private setUpEventListeners()
	{
		if (this.startBtn)
		{
			Router.addEventListener(this.startBtn, 'click', this.handleStart);
		}
		
		if (this.leaveBtn)
		{
			Router.addEventListener(this.leaveBtn, 'click', this.handleLeave);
		}
	}

	private handleStart = async () =>
	{
		if (!this.isOwner || !this.tournamentId) return;

		try
		{
			console.log('[TournamentLobby] Starting tournament:', this.tournamentId);
			const res = await fetch('/api/start-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tournamentId: this.tournamentId })
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

	private handleLeave = async () =>
	{
		try
		{
			const res = await fetch('/api/leave-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tournamentId: this.tournamentId, userId: this.user.id })
			});

			if (res.ok)
			{
				this.router.navigateTo('tournament-menu', '');
			}
		}
		catch (e)
		{
			console.error('Error leaving tournament:', e);
		}
	}

	public destroy(): void
	{
		if (this.intervalId)
		{
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		if (this.startBtn)
		{
			Router.removeEventListener(this.startBtn, 'click', this.handleStart);
		}
		
		if (this.leaveBtn)
		{
			Router.removeEventListener(this.leaveBtn, 'click', this.handleLeave);
		}
	}
}
