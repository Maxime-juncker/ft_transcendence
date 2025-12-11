import { ViewComponent } from "ViewComponent.js";
import { StartView } from "start.js";
import { LoginView } from "login.js";
import { LobbyView } from "lobby.js";
import { SettingsView } from "settings.js";
import { ProfileView } from "profile.js"

export class Router
{
	private routes: Route[];
	private static m_instance: Router = null;
	private m_view: ViewComponent = null;
	
	public static get Instance(): Router { return Router.m_instance; }
	public get view(): ViewComponent { return this.m_view; }
	public set view(view: ViewComponent)
	{
		const app = document.getElementById("app");

		// clearing childrens
		for (let i = 0; i < app.children.length; i++)
		{
			const view = app.children[i] as ViewComponent;
			view.disable();
			view.remove();
		}
		app.innerHTML = "";
		app.prepend(view);
		this.m_view = view;
		view.enable();
	}

	constructor(routes: Route[])
	{
		if (Router.m_instance == null)
			Router.m_instance = this;

		this.routes = routes;
		this.loadInitialRoute();
	}

	public static getElementById(id: string): HTMLElement
	{
		if (Router.Instance === null)
			return null;
		return Router.Instance.view.querySelector(`#${id}`);
	}

	public getCurrentURL()
	{
		const path = window.location.pathname;
		return path;
	}

	public matchUrlToRoute(urlSegs: string)
	{
		const urlNoQuery = urlSegs.split('?');
		const matchedRoute = this.routes.find(route => route.path === urlNoQuery[0]);
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
			throw new Error(`route not found: ${url}`);
	
		matchRoute.callback();
	}

	public navigateTo(path: string)
	{
		window.history.pushState({}, '', path);
		this.loadRoute(path);
	}
}

function loadPage(componentName: string, templateId: string)
{
	const view = document.createElement(componentName) as ViewComponent;
	view.setAttribute("templateId", templateId);
	Router.Instance.view = view;
}

type Route = {
	path: string,
	callback: () => void;
}

const routes: Route[] = [
	{ path: "/", callback: () => loadPage("start-view", "start-template")},
	{ path: "/login", callback: () => loadPage("login-view", "login-template")},
	{ path: "/lobby", callback: () => loadPage("lobby-view", "lobby-template")},
	{ path: "/profile", callback: () => loadPage("profile-view", "profile-template")},
	{ path: "/settings", callback: () => loadPage("settings-view", "settings-template")},
]

customElements.define('view-component', ViewComponent);
customElements.define('start-view', StartView);
customElements.define('login-view', LoginView);
customElements.define('lobby-view', LobbyView);
customElements.define('settings-view', SettingsView);
customElements.define('profile-view', ProfileView);

const router = new Router(routes);

window.addEventListener('popstate', () => {
  router.loadInitialRoute();
});
