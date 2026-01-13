import { User } from 'modules/user/User.js';
import { GameRouter } from '../router.js';
import { Router } from 'modules/router/Router.js';

export class TournamentLobby
{
	private playerList = document.getElementById('lobby-player-list') as HTMLDivElement;
	private requestList = document.getElementById('lobby-request-list') as HTMLDivElement;
	private requestsContainer = document.getElementById('lobby-requests-container') as HTMLDivElement;
	private startBtn = document.getElementById('lobby-start-btn') as HTMLButtonElement;
	private leaveBtn = document.getElementById('lobby-leave-btn') as HTMLButtonElement;
	private lobbyTitle = document.getElementById('lobby-title') as HTMLElement;
	
	private intervalId: number | null = null;
	private isOwner: boolean = false;

	constructor(private router: GameRouter, private user: User, private tournamentId: string | null)
	{
		this.init();
		this.setUpDocumentEventListeners();
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
		this.intervalId = window.setInterval(() => this.fetchLobbyState(), 2000);
	}

	private async fetchLobbyState()
	{
		try
		{
			const res = await fetch(`/api/tournament/${this.tournamentId}`, { cache: 'no-store' });
			if (!res.ok)
			{
				const data = await res.json().catch(() => ({}));
				if (res.status === 404)
				{
					this.router.navigateTo('tournament-menu', '');
					return ;
				}

				return ;
			}
			const data = await res.json();
			
			if (data.status === 'started')
			{
				this.renderMatches(data);
				return;
			}

			this.render(data);
		}
		catch (e)
		{
			console.error(e);
		}
	}

	private renderMatches(data: any)
	{
		if (this.lobbyTitle) this.lobbyTitle.innerText = "Tournament In Progress";
		if (this.requestsContainer) this.requestsContainer.style.display = 'none';
		if (this.startBtn) this.startBtn.style.display = 'none';
		if (this.leaveBtn) this.leaveBtn.style.display = 'none';
		
		if (this.playerList)
		{
			this.playerList.innerHTML = '';
			const matchesDiv = document.createElement('div');
			matchesDiv.className = 'flex flex-col gap-2 w-full';
			
			if (data.matches && Array.isArray(data.matches)) {
				data.matches.forEach((m: any, i: number) =>
				{
					const div = document.createElement('div');
					div.className = 'bg-darker p-3 rounded flex justify-between items-center text-white';
					const p1 = m._player1 || 'Unknown';
					const p2 = m._player2 || 'Unknown';
					const winner = m._winner;
					
					div.innerHTML = `
						<span class="font-bold">Match ${i + 1}</span>
						<div class="flex gap-4">
							<span class="${winner === p1 ? 'text-green-500' : ''}">${p1}</span>
							<span class="text-gray-500">vs</span>
							<span class="${winner === p2 ? 'text-green-500' : ''}">${p2}</span>
						</div>
					`;
					
					if (winner)
					{
						div.innerHTML += `<span class="bg-blue-600 px-2 rounded text-sm">Finished</span>`;
					}
					else
					{
						if (m.gameId && (m._p1Id == this.user.id || m._p2Id == this.user.id))
						{
							const joinBtn = document.createElement('button');
							joinBtn.className = 'btn-small bg-green-600 px-2 py-1 rounded text-sm hover:bg-green-500 cursor-pointer';
							joinBtn.innerText = 'JOIN MATCH NOW';
							joinBtn.onclick = () => {
								this.router.navigateTo('game', 'online');
							};
							div.appendChild(joinBtn);
							
							if (this.router.currentPage !== 'game')
							{
								setTimeout(() => this.router.navigateTo('game', 'online'), 100);
							}
						}
						else
						{
							div.innerHTML += `<span class="bg-yellow-600 px-2 rounded text-sm">Pending</span>`;
						}
					}
					matchesDiv.appendChild(div);
				});
			}
			this.playerList.appendChild(matchesDiv);
		}
	}

	private render(data: any)
	{
		this.isOwner = data.ownerId === this.user.id;
		if (this.lobbyTitle) this.lobbyTitle.innerText = data.ownerName + "'s Tournament";
		
		if (this.playerList)
		{
			this.playerList.innerHTML = '';
			data.players.forEach((p: any) =>
			{
				const div = document.createElement('div');
				div.className = 'text-white bg-dark p-2 rounded';
				div.innerText = p.name;
				this.playerList.appendChild(div);
			});
		}

		if (this.isOwner && data.type === 'private')
		{
			if (this.requestsContainer)
			{
				this.requestsContainer.style.display = 'flex';
			}

			if (this.requestList)
			{
				this.requestList.innerHTML = '';
				data.requests.forEach((r: any) =>
				{
					const div = document.createElement('div');
					div.className = 'flex justify-between items-center text-white bg-dark p-2 rounded';
					div.innerHTML = `
						<span>${r.name}</span>
						<div class="flex gap-2">
							<button class="accept-btn btn-small bg-green-600 text-xs px-2 py-1 rounded" data-id="${r.id}">✓</button>
							<button class="reject-btn btn-small bg-red-600 text-xs px-2 py-1 rounded" data-id="${r.id}">✗</button>
						</div>
					`;
					div.querySelector('.accept-btn')?.addEventListener('click', () => this.handleRequest(r.id, true));
					div.querySelector('.reject-btn')?.addEventListener('click', () => this.handleRequest(r.id, false));
					this.requestList.appendChild(div);
				});
			}
		}
		else if (this.requestsContainer)
		{
			this.requestsContainer.style.display = 'none';
		}

		if (this.startBtn)
		{
			if (this.isOwner)
			{
				this.startBtn.style.display = 'block';
				this.startBtn.disabled = data.players.length < 2; 
			}
			else
			{
				this.startBtn.style.display = 'none';
			}
		}
	}

	private async handleRequest(userId: string, accept: boolean)
	{
		await fetch('/api/tournament-request',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tournamentId: this.tournamentId, userId, accept })
		});
		this.fetchLobbyState();
	}

	private startTournament = async () =>
	{
		await fetch('/api/start-tournament',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tournamentId: this.tournamentId })
		});
	}

	private leaveTournament = async () =>
	{
		await fetch('/api/leave-tournament',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tournamentId: this.tournamentId, userId: this.user.id })
		});

		this.router.navigateTo('tournament-menu', '');
	}

	private setUpDocumentEventListeners(): void
	{
		Router.addEventListener(this.startBtn, 'click', this.startTournament);
		Router.addEventListener(this.leaveBtn, 'click', this.leaveTournament);
	}

	public destroy(): void
	{
		if (this.intervalId) clearInterval(this.intervalId);
		Router.removeEventListener(this.startBtn, 'click', this.startTournament);
		Router.removeEventListener(this.leaveBtn, 'click', this.leaveTournament);
	}
}
