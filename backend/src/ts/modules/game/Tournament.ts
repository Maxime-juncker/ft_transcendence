class Match
{
	constructor(public readonly _player1: string,
		public readonly _player2: string,
		public _score1: number = 0,
		public _score2: number = 0,
		private _winner: string | null = null) {}

	get winner(): string | null { return (this._winner); }

	set winner(winner: string)
	{
		if (this._winner !== null)
		{
			throw new Error('Winner has already been set for this match.');
		}
		else if (winner !== this._player1 && winner !== this._player2)
		{
			throw new Error('Winner must be one of the players in the match.');
		}

		this._winner = winner;
	}
}

export class Tournament
{
	private _players: Array<string> = [];
	private _matches: Array<Match> = [];
	private _next: Tournament | null = null;

	constructor(inputs: Set<string>, public readonly _depth: number = 0)
	{
		if (this._depth > 0)
		{
			this.init(inputs);
		}
		else
		{
			this._players = Array.from(inputs);
		}

		if (this._players.length > 1)
		{
			this.generateMatches();
		}
	}

	private init(inputs: Set<string>): void
	{
		const nbBot = (inputs.size === 1) ? 1 : Math.pow(2, Math.ceil(Math.log2(inputs.size))) - inputs.size;
		for (let i = 0; i < nbBot; i++)
		{
			inputs.add(`Bot_${i + 1}`);
		}

		this._players = this.shuffleArray(Array.from(inputs));
	}

	private shuffleArray<T>(array: T[]): T[]
	{
		for (let i = array.length - 1; i > 0; i--)
		{
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}

		return (array);
	}

	private generateMatches(): void
	{
		for (let i = 0; i < this._players.length; i += 2)
		{
			this._matches.push(new Match(this._players[i], this._players[i + 1]));
		}
	}

	get players(): Array<string>	{ return (this._players); }
	get matches(): Array<Match>		{ return (this._matches); }
	get next(): Tournament | null	{ return (this._next); }

	set next(tournament: Tournament)
	{
		if (this._next !== null)
		{
			throw new Error('Next tournament has already been set.');
		}

		this._next = tournament;
	}

	public destroy(): void
	{
		if (this._next)
		{
			this._next!.destroy();
			this._next = null;
		}
	}
}
