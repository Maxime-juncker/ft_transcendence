class Router
{
	currentPage: string;
	pages: { [key: string]: HTMLDivElement };
	gameInstance: any = null;

	constructor()
	{
		this.currentPage = 'home';
		this.pages = 
		{
			home: document.querySelector('.home') as HTMLDivElement,
			game: document.querySelector('.game-container') as HTMLDivElement,
		};
		this.init();
	}

	init()
	{
		window.addEventListener('popstate', (e) =>
		{
			const page = e.state?.page || 'home';
			this.showPage(page, false);
		});

		window.addEventListener('keydown', (e) =>
		{
			if (e.key === 'Escape' && this.currentPage === 'game')
			{
				this.showPage('home', false);
			}
		});

		this.showPage(this.currentPage, false);
	}

	navigateTo(page: string, data = {})
	{
		history.pushState({ page, ...data }, '', `#${page}`);
		this.showPage(page, data);
	}

	showPage(page: string, data = {})
	{
		this.onPageChange(page, data);
		for (const key in this.pages)
		{
			if (this.pages.hasOwnProperty(key))
			{
				this.pages[key].style.display = 'none';
			}
		}

		if (this.pages[page])
		{
			this.pages[page].style.display = 'flex';
			this.currentPage = page;
		}
	}

	onPageChange(page: string, data: any)
	{
		if (this.currentPage === 'game' && page !== 'game' && this.gameInstance)
		{
			this.gameInstance.destroy();
			this.gameInstance = null;
		}
		if (page === 'game')
		{
			this.gameInstance = new Game();
		}
	}
};

const router = new Router();

document.getElementById('1player')?.addEventListener('click', () =>
{
	// TODO: AI mode
});

document.getElementById('2player')?.addEventListener('click', () =>
{
	router.navigateTo('game', { mode: 2 });
});
