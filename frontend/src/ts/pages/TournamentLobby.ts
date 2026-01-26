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
	private lastRoundCount: number = 0;
	private overlayEndTime: number = 0;
	private isDestroyed: boolean = false;

	constructor(private router: GameRouter, private user: User, private tournamentId: string | null)
	{
		if (!this.tournamentId || this.tournamentId === '')
		{
			this.tournamentId = localStorage.getItem('currentTournamentId');
		}
		else
		{
			localStorage.setItem('currentTournamentId', this.tournamentId);
		}

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
		if (this.isDestroyed) return;
		try
		{
			const res = await fetch(`/api/tournament/${this.tournamentId}`, { cache: 'no-store' });
			if (this.isDestroyed) return;

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
			console.log('Lobby Data:', data);
			
			if (data.status === 'started' || data.status === 'finished')
			{
				this.renderBracket(data);
				return;
			}

			this.render(data);
		}
		catch (e)
		{
			console.error(e);
		}
	}

	private renderBracket(data: any)
	{
		if (this.lobbyTitle)
		{
			if (data.status === 'finished' && data.winner)
			{
				this.lobbyTitle.innerHTML = `The winner is <span class="text-green-400">${data.winner}</span>`;
			}
			else
			{
				this.lobbyTitle.innerText = "Tournament Bracket";
			}
		}

		if (this.requestsContainer) this.requestsContainer.style.display = 'none';
		if (this.startBtn) this.startBtn.style.display = 'none';
		if (this.leaveBtn) this.leaveBtn.style.display = 'none';
		
		const totalPlayers = data.players?.length || 0;
		if (totalPlayers < 2)
		{
			return ;
		}

		const totalRounds = Math.ceil(Math.log2(totalPlayers));
		const currentRounds = data.rounds || [];
		
		if (currentRounds.length > this.lastRoundCount)
		{
			this.lastRoundCount = currentRounds.length;
			this.overlayEndTime = Date.now() + 5000;
		}

		if (this.playerList)
		{
			this.playerList.innerHTML = '';

			const getMatch = (r: number, i: number) =>
			{
				if (currentRounds[r] && currentRounds[r][i]) return currentRounds[r][i];
				return { _player1: '?', _player2: '?', _winner: null };
			};

			const createMatchBox = (m: any, isCenter: boolean = false) =>
			{
				const template = document.getElementById('tournament-match-template') as HTMLTemplateElement;
				if (!template)
				{
					console.error('tournament-match-template not found');
					return document.createElement('div');
				}

				const clone = template.content.cloneNode(true) as DocumentFragment;
				const box = clone.querySelector('.match-box') as HTMLElement;
				
				const p1 = m._player1 || '?';
				const p2 = m._player2 || '?';
				const winner = m._winner;

				if (winner) box.setAttribute('data-has-winner', 'true');
				
				const p1Container = box.querySelector('.player1-container') as HTMLElement;
				const p2Container = box.querySelector('.player2-container') as HTMLElement;
				const p1Name = box.querySelector('.player1-name') as HTMLElement;
				const p2Name = box.querySelector('.player2-name') as HTMLElement;
				const p1Score = box.querySelector('.player1-score') as HTMLElement;
				const p2Score = box.querySelector('.player2-score') as HTMLElement;

				const p1Class = winner === p1 ? 'text-green-400 font-bold' : (winner ? 'text-red-400 opacity-50' : 'text-white');
				const p2Class = winner === p2 ? 'text-green-400 font-bold' : (winner ? 'text-red-400 opacity-50' : 'text-white');

				if (p1Container) p1Container.className += ` ${p1Class}`;
				if (p2Container) p2Container.className += ` ${p2Class}`;
				if (p1Name) p1Name.textContent = p1;
				if (p2Name) p2Name.textContent = p2;

				const s1 = (m._score1 !== undefined && m._score1 !== null) ? m._score1 : '';
				const s2 = (m._score2 !== undefined && m._score2 !== null) ? m._score2 : '';
				
				if (p1Score) p1Score.textContent = String(s1);
				if (p2Score) p2Score.textContent = String(s2);
				
				if (isCenter && data.status === 'finished' && data.winner)
				{
					box.classList.add('border-yellow-500', 'bg-yellow-900/20');
				}

				if (!winner && m.gameId && (m._p1Id == this.user.id || m._p2Id == this.user.id))
				{
					box.classList.add('ring-4', 'ring-yellow-400', 'animate-pulse');
					const now = Date.now();
					
					const timeLeft = this.overlayEndTime - now;
					
					if (timeLeft <= 0)
					{
						const notif = document.getElementById('lobby-notification');
						if (notif) notif.style.display = 'none';
						
						console.log("Match ready! Joining...", m.gameId);
						if (!this.isDestroyed)
						{
							this.isDestroyed = true;
							this.router.navigateTo('game', 'online');
						}
					}
					else
					{
						const countdown = Math.ceil(timeLeft / 1000);
						let notif = document.getElementById('lobby-notification');
						if (!notif)
						{
							notif = document.createElement('div');
							notif.id = 'lobby-notification';
							notif.className = 'fixed top-32 left-1/2 -translate-x-1/2 bg-yellow-600 text-white px-8 py-4 rounded-full shadow-2xl z-50 text-3xl font-bold animate-pulse border-4 border-yellow-400';
							document.body.appendChild(notif);
						}

						notif.style.display = 'block';
						notif.innerText = `YOUR MATCH STARTS IN ${countdown}s`;
					}
				}
				
				const wrapper = document.createElement('div');
				wrapper.appendChild(clone);
				return (wrapper.firstElementChild as HTMLElement);
			};

			const scrollWrapper = document.createElement('div');
			scrollWrapper.className = 'w-full h-full overflow-auto relative custom-scrollbar max-h-[70vh]';

			const bracketContent = document.createElement('div');
			bracketContent.className = 'min-w-max min-h-max flex justify-center items-center gap-16 p-12 relative';

			const leftCols: any[] = [];
			const rightCols: any[] = [];
			
			for (let r = 0; r < totalRounds - 1; r++)
			{
				const matchCount = Math.pow(2, totalRounds - 1 - r);
				const half = matchCount / 2;
				
				const colL = document.createElement('div');
				colL.className = 'flex flex-col justify-around gap-8';
				colL.style.height = `${matchCount * 120}px`;
				
				for(let i = 0; i < half; i++)
				{
					colL.appendChild(createMatchBox(getMatch(r, i)));
				}
				leftCols.push(colL);
				
				const colR = document.createElement('div');
				colR.className = 'flex flex-col justify-around gap-8';
				colR.style.height = `${matchCount * 120}px`; 
				
				for(let i = half; i < matchCount; i++)
				{
					colR.appendChild(createMatchBox(getMatch(r, i)));
				}
				rightCols.push(colR);
			}
			
			const centerCol = document.createElement('div');
			centerCol.className = 'flex flex-col justify-center z-20';
			
			centerCol.appendChild(createMatchBox(getMatch(totalRounds - 1, 0), true));

			leftCols.forEach(c => bracketContent.appendChild(c));
			bracketContent.appendChild(centerCol);
			[...rightCols].reverse().forEach(c => bracketContent.appendChild(c));

			const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none z-0');

			setTimeout(() =>
			{
				const drawLine = (e1: Element, e2: Element) =>
				{
					const r1 = e1.getBoundingClientRect();
					const r2 = e2.getBoundingClientRect();
					const c = bracketContent.getBoundingClientRect();
					
					let startX, startY, endX, endY;

					if (r1.left < r2.left)
					{
						startX = r1.right - c.left; 
						endX = r2.left - c.left;
					}
					else
					{
						startX = r1.left - c.left;
						endX = r2.right - c.left;
					}
					
					startY = r1.top + r1.height/2 - c.top;
					endY = r2.top + r2.height/2 - c.top;

					const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

					const midX = startX + (endX - startX) / 2;
					const d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

					path.setAttribute("d", d);

					const hasWinner = e1.getAttribute('data-has-winner') === 'true';

					if (hasWinner)
					{
						path.setAttribute("stroke", "#4ade80");
						path.setAttribute("stroke-opacity", "1");
						path.setAttribute("stroke-width", "4");
					}
					else
					{
						path.setAttribute("stroke", "white");
						path.setAttribute("stroke-opacity", "0.3");
						path.setAttribute("stroke-width", "2");
					}
					
					path.setAttribute("fill", "none");
					svg.appendChild(path);
				};
				
				for (let i = 0; i < leftCols.length; i++)
				{
					const curr = leftCols[i];
					const next = (i === leftCols.length - 1) ? centerCol : leftCols[i+1];
					const targets = next.children;
					Array.from(curr.children).forEach((child, idx) =>
					{
						const target = targets[Math.floor(idx/2)];
						if (target) drawLine(child as any, target);
					});
				}

				for (let i = 0; i < rightCols.length; i++)
				{
					const curr = rightCols[i];
					const next = (i === rightCols.length - 1) ? centerCol : rightCols[i+1];
					const targets = next.children;
					Array.from(curr.children).forEach((child, idx) =>
					{
						const target = targets[Math.floor(idx / 2)];
						if (target)
						{
							drawLine(child as any, target);
						}
					});
				}
			}, 50);

			bracketContent.appendChild(svg);
			scrollWrapper.appendChild(bracketContent);
			this.playerList.appendChild(scrollWrapper);
		}
	}

	private render(data: any)
	{
		this.isOwner = data.ownerId === this.user.id;
		if (this.lobbyTitle) this.lobbyTitle.innerText = data.ownerName + "'s Tournament";
		
		if (!this.playerList)
		{
			console.error("TournamentLobby: playerList element not found!");
			this.playerList = document.getElementById('lobby-player-list') as HTMLDivElement;
		}

		if (this.playerList)
		{
			this.playerList.innerHTML = '';
			const template = document.getElementById('tournament-player-template') as HTMLTemplateElement;

			data.players.forEach((p: any) =>
			{
				if (template)
				{
					const clone = template.content.cloneNode(true) as DocumentFragment;
					const nameSpan = clone.querySelector('.player-name') as HTMLElement;
					if (nameSpan) nameSpan.textContent = p.name;
					this.playerList.appendChild(clone);
				}
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
				const template = document.getElementById('tournament-request-template') as HTMLTemplateElement;

				data.requests.forEach((r: any) =>
				{
					if (template)
					{
						const clone = template.content.cloneNode(true) as DocumentFragment;
						const nameSpan = clone.querySelector('.request-name') as HTMLElement;
						const acceptBtn = clone.querySelector('.accept-btn') as HTMLElement;
						const rejectBtn = clone.querySelector('.reject-btn') as HTMLElement;

						if (nameSpan) nameSpan.textContent = r.name;
						acceptBtn?.addEventListener('click', () => this.handleRequest(r.id, true));
						rejectBtn?.addEventListener('click', () => this.handleRequest(r.id, false));
						
						this.requestList.appendChild(clone);
					}
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
		this.isDestroyed = true;
		if (this.intervalId) clearInterval(this.intervalId);
		Router.removeEventListener(this.startBtn, 'click', this.startTournament);
		Router.removeEventListener(this.leaveBtn, 'click', this.leaveTournament);
	}
}
