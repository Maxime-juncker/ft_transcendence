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

		this.m_board.innerHTML = "";

		const test = document.createElement("h1");
		test.innerText = "hello";

		this.m_board.append(test);
	}
}
