import { Router } from "modules/router/Router.js";
import { StartView } from "./start.js";

export class BlockchainBoard
{
	private m_board: HTMLElement | null = null;
	private m_template: HTMLTemplateElement | null = null;
	private m_view: StartView | null = null;

	public constructor() {}

	public async init(view: StartView, board: HTMLElement | null)
	{
		this.m_board = board;
		this.m_view = view;
		this.m_template = Router.getElementById("tournament-table-template") as HTMLTemplateElement;
	}

	public async refresh()
	{
		if (!this.m_board || !this.m_template)
		{
			console.warn("board or template is null");
			return;
		}

		this.m_board.innerHTML = "";
		this.m_view?.loadingIndicator?.startLoading();
		let tournaments = await fetch('/api/blockchain/tournaments');
		let json = await tournaments.json();
		console.log("tournaments called with ", tournaments, " as a result");
		console.log("after call");
		this.m_view?.loadingIndicator?.stopLoading();
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
				winner.innerText = "winner: " + data.winner;
			if (clone)
				this.m_board.append(clone);
		});
	}
}
