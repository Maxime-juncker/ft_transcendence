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
	
	public static get Instance(): Router { return Router.m_instance; }

	constructor(routes: Route[])
	{
		if (Router.m_instance == null)
			Router.m_instance = this;

		console.log(Router.Instance)

		this.routes = routes;
		this.loadInitialRoute();
	}

	public getCurrentURL()
	{
		const path = window.location.pathname;
		return path;
	}

	public matchUrlToRoute(urlSegs: string)
	{
		const matchedRoute = this.routes.find(route => route.path === urlSegs);
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
		console.log(path);
		window.history.pushState({}, '', path);
		this.loadRoute(path);
	}
}

function loadPage(componentName: string, templateId: string)
{
	const app = document.getElementById("app");
	
	if (app.children.length > 0)
	{
		const oldView = app.children[0] as ViewComponent;
		oldView.disable();
		oldView.remove();
	}
	app.innerHTML = "";

	const view = document.createElement(componentName) as ViewComponent;
	view.setAttribute("templateId", templateId);

	app.prepend(view);
	view.enable();
	window.dispatchEvent(new Event('pageChanged'));
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
