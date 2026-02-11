export class BlockchainBoard
{
	private m_board: HTMLElement | null = null;

	public constructor() {}

	public async init(board: HTMLElement | null)
	{
		this.m_board = board;
	}

	public async refresh()
	{
		if (!this.m_board)
		{
			console.warn("board is null");
			return;
		}
		console.log("before call");
		let tournaments = await fetch('/api/blockchain/tournaments');
		let json = await tournaments.text();
		console.log("tournaments called with ", tournaments, " as a result");
		console.log("after call");
		this.m_board.innerHTML = "";

		const test = document.createElement("h1");
		test.innerText = json;

		this.m_board.append(test);
	}
}
