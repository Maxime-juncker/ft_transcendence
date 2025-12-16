import { ViewComponent } from "./ViewComponent.js";
import { StartView } from "start.js";
import { LoginView } from "login.js";
import { LobbyView } from "lobby.js";
import { SettingsView } from "settings.js";
import { ProfileView } from "profile.js"

export class Router
{
	private static m_instance: Router = null;

	private m_routes:		Route[];
	private m_views:		Map<string, ViewComponent>;
	private m_app:			HTMLElement = null;

	private m_prevView:		ViewComponent = null;
	private m_activeView:	ViewComponent = null;
	
	public static get Instance(): Router { return Router.m_instance; }

	public get activeView(): ViewComponent { return this.m_activeView; }
	public get prevView(): ViewComponent { return this.m_prevView; }

	constructor(routes: Route[])
	{
		if (Router.m_instance == null)
			Router.m_instance = this;

		this.m_app = document.getElementById("app");
		if (this.m_app === null)
			throw new Error("no app container found. Abording");

		this.m_views = new Map<string, ViewComponent>();
		this.m_routes = routes;
		this.createRoutes();
		this.loadInitialRoute();

		window.addEventListener('popstate', () => {
			this.loadInitialRoute();
		});
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

		this.m_activeView = this.m_views.get(viewName);
		this.m_activeView.enable();
		this.m_activeView.style.display = "block";
		this.m_activeView.style.height = "100%";

		console.log(this.getCurrentURL())
	}

	/**
	 * get an element by id in the active view (to user instead of document.getElementById)
	 * @param {string} id the id to search for
	*/
	public static getElementById(id: string): HTMLElement
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

		Router.Instance.activeView.addTrackListener(element, event, handler);
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

		Router.Instance.activeView.removeTrackListener(element, event, handler);
	}

	public getCurrentURL()
	{
		const path = window.location.pathname;
		return path;
	}

	public matchUrlToRoute(urlSegs: string): Route
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
		const matchRoute = this.matchUrlToRoute(url);
		if (!matchRoute)
			throw new Error(`route not found: ${url}`); // TODO: add 404 page
	
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


type Route = {
	path:		string,
	viewName:	string,
	templateId: string,
}

const routes: Route[] = [
	{ path: "/",			viewName: "start-view",		templateId: "start-template" },
	{ path: "/login",		viewName: "login-view",		templateId: "login-template" },
	{ path: "/lobby",		viewName: "lobby-view",		templateId: "lobby-template" },
	{ path: "/profile",		viewName: "profile-view",	templateId: "profile-template" },
	{ path: "/settings",	viewName: "settings-view",	templateId: "settings-template" },
]

customElements.define('view-component', ViewComponent);
customElements.define('start-view', StartView);
customElements.define('login-view', LoginView);
customElements.define('lobby-view', LobbyView);
customElements.define('settings-view', SettingsView);
customElements.define('profile-view', ProfileView);

const router = new Router(routes);

