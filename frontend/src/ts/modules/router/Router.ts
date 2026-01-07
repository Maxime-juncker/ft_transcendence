import { ViewComponent } from "./ViewComponent.js";

export type Route = {
	path:		string,
	viewName:	string,
	templateId: string,
}

export class Router
{
	private static m_instance: Router | null = null;

	private m_routes:		Route[];
	private m_views:		Map<string, ViewComponent>;
	private m_app:			HTMLElement;

	private m_prevView:		ViewComponent | null = null;
	private m_activeView:	ViewComponent | null = null;
	
	public static get Instance(): Router | null { return Router.m_instance; }

	get activeView(): ViewComponent | null { return this.m_activeView; }
	get prevView(): ViewComponent   | null { return this.m_prevView; }

	constructor(routes: Route[])
	{
		if (Router.m_instance == null)
			Router.m_instance = this;

		const app = document.getElementById("app");
		if (app === null)
			throw new Error("no app container found. Abording");
		this.m_app = app;

		this.m_views = new Map<string, ViewComponent>();
		this.m_routes = routes;
		this.createRoutes();
		this.loadInitialRoute();

		window.addEventListener('popstate', () => {
			this.loadInitialRoute();
		});

		// if url contain hash, browser will scroll to it which shift everything up
		if (window.location.hash)
		{
			setTimeout(() => {
				window.scrollTo(0, 0);
			}, 0);
		}
	}

	/**
	 * set the current view
	 * @param viewName the name of the view to load
	 * @note disable() will be called on previous view
	 * @note enable() will be called on new view
	 */
	public async setView(viewName: string)
	{
		// disable previous view
		if (this.m_activeView !== null)
		{
			await this.m_activeView.disable();
			this.m_activeView.style.display = "none";
			this.m_prevView = this.m_activeView;
		}

		var view = this.m_views.get(viewName);
		if (!view || view == undefined)
		{
			return
		}
		this.m_activeView = view;
		this.m_activeView.enable();
		this.m_activeView.style.display = "block";
		this.m_activeView.style.height = "100%";
	}

	/**
	 * get an element by id in the active view (to user instead of document.getElementById)
	 * @param {string} id the id to search for
	 * @returns element or null if instance not set or no active view
	*/
	public static getElementById(id: string): HTMLElement | null
	{
		if (Router.Instance === null)
			return null;
		if (Router.Instance.activeView === null)
			return Router.Instance.m_app.querySelector(`#${id}`);
		return Router.Instance.activeView.querySelector(`#${id}`);
	}

	/**
	* add a track event listener to the current view
	* @param element html element to add the listener to
	* @param event event type
	* @param handler handler function to call
	*/
	public static addEventListener(element: HTMLElement, event: string, handler: EventListener)
	{
		if (Router.Instance === null || Router.Instance.m_activeView === null)
			return ;

		Router.Instance.activeView?.addTrackListener(element, event, handler);
	}

	/**
	* remove a track event listener to the current view
	* @param element html element to add the listener to
	* @param event event type
	* @param handler handler function to call
	*/
	public static removeEventListener(element: HTMLElement, event: string, handler: EventListener)
	{
		if (Router.Instance === null || Router.Instance.m_activeView === null)
			return ;

		Router.Instance.activeView?.removeTrackListener(element, event, handler);
	}

	public getCurrentURL()
	{
		const path = window.location.pathname;
		return path;
	}

	public matchUrlToRoute(urlSegs: string): Route | undefined
	{
		const urlNoQuery = urlSegs.split('?');
		const matchedRoute = this.m_routes.find(route => route.path === urlNoQuery[0]);
		return matchedRoute;
	}

	public loadInitialRoute()
	{
		this.loadRoute(window.location.pathname);
	}

	loadRoute(url: string)
	{
		var matchRoute = this.matchUrlToRoute(url);
		if (!matchRoute)
		{
			console.error(`route not found: ${url}`);
			this.setView("*")
			return;
		}
	
		this.setView(matchRoute.path);
	}

	public navigateTo(path: string)
	{
		window.history.pushState({}, '', path);
		this.loadRoute(path);
	}

	// function to create all route in app container
	public createRoutes()
	{
		this.m_routes.forEach((route: Route) => {
			const view = document.createElement(route.viewName) as ViewComponent;
			view.setAttribute("templateId", route.templateId);
			view.routePath = route.path;

			this.m_app.append(view);

			view.style.display = "none"; // hide all route
			this.m_views.set(route.path, view);
		});
	}
}

