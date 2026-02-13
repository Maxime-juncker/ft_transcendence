import { getBot } from 'modules/users/userManagment.js';

class Match
{
	constructor(public readonly _player1: number,
		public readonly _player2: number,
		public _score1: number = 0,
		public _score2: number = 0,
		private _winner: number | null = null) {}

	public static isBot(player: number): boolean
	{
		return (player === 1);
	}

	set score1(score: number) { this._score1 = score; }
	set score2(score: number) { this._score2 = score; }

	public isBotVsBot(): boolean
	{
		return Match.isBot(this._player1) && Match.isBot(this._player2);
	}

	public isHumanVsBot(): boolean
	{
		return Match.isBot(this._player1) !== Match.isBot(this._player2);
	}

	public getBotPlayer(): number | null
	{
		if (Match.isBot(this._player1)) return this._player1;
		if (Match.isBot(this._player2)) return this._player2;
		return null;
	}

	public getHumanPlayer(): number | null
	{
		if (!Match.isBot(this._player1)) return this._player1;
		if (!Match.isBot(this._player2)) return this._player2;
		return null;
	}

	get winner(): number | null { return (this._winner); }

	set winner(winner: number)
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
	private _players: Array<number> = [];
	private _matches: Array<Match> = [];
	private _next: Tournament | null = null;
	public isFinished: boolean = false;

	private constructor(players: Array<number>, public readonly _depth: number = 0)
	{
		this._players = players;
		if (this._players.length > 1)
		{
			this.generateMatches();
		}
	}

	public static async create(inputs: Set<number>, depth: number = 0): Promise<Tournament>
	{
		let players: Array<number>;
		
		if (depth === 0)
		{
			const nbBot = (inputs.size === 1) ? 1 : Math.pow(2, Math.ceil(Math.log2(inputs.size))) - inputs.size;
			const bot = await getBot();
			for (let i = 0; i < nbBot; i++)
			{
				inputs.add(bot);
			}
			players = Tournament.shuffleArray(Array.from(inputs));
		}
		else
		{
			players = Array.from(inputs);
		}

		return new Tournament(players, depth);
	}

	private static shuffleArray<T>(array: T[]): T[]
	{
		for (let i = array.length - 1; i > 0; i--)
		{
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}

		return array;
	}

	private generateMatches(): void
	{
		for (let i = 0; i < this._players.length; i += 2)
		{
			this._matches.push(new Match(this._players[i], this._players[i + 1]));
		}
	}

	get players(): Array<number>	{ return (this._players); }
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
