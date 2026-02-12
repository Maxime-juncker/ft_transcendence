import { Router } from "modules/router/Router.js";

export class BlockchainBoard
{
	private m_board: HTMLElement | null = null;
	private m_template: HTMLTemplateElement | null = null;

	public constructor() {}

	public async init(board: HTMLElement | null)
	{
		this.m_board = board;
		this.m_template = Router.getElementById("tournament-table-template") as HTMLTemplateElement;
	}

	public async refresh()
	{
		const title = Router.getElementById("blockchain-ranking-title") as HTMLElement;
		if (!this.m_board || !this.m_template || !title)
		{
			console.warn("board or template is null");
			return;
		}


		let tournaments = await fetch('/api/blockchain/tournaments');
		let json = await tournaments.json();
		console.log("tournaments called with ", tournaments, " as a result");
		console.log("after call");
		json.forEach((data: any) => {
			if (!this.m_board || !this.m_template)
			{
				console.warn("board or template is null");
				return;
			}
			const clone = this.m_template.content.cloneNode(true) as DocumentFragment;
			const addr = clone.querySelector("#tournament-address") as HTMLLinkElement;
			if (addr) {
				addr.href = "https://testnet.avascan.info/blockchain/c/address/" + data.address;
				addr.innerText = data.address;
			}
			const winner = clone.querySelector("#winner-name") as HTMLElement;
			if (winner)
				winner.innerText = data.winner;
			if (clone)
				this.m_board.append(clone);
			// this.m_board.append(winner);
		});
		this.m_board.append(title);



			

		// const test = document.createElement("h1");
		// test.innerText = json;

	}
}
