import { Route, Router } from "modules/router/Router.js";
import { ViewComponent } from "modules/router/ViewComponent.js";
import { ThemeController } from "modules/pages/Theme.js";
import { loadTheme } from "themes.js";
import * as utils from "modules/utils/utils.js";

import { StartView } from "modules/pages/start.js";
import { LoginView } from "modules/pages/login.js";
import { LobbyView } from "modules/pages/lobby.js";
import { SettingsView } from "modules/pages/settings.js";
import { ProfileView } from "modules/pages/profile.js"
import { SearchView } from "modules/pages/search.js";
import { AboutView } from "modules/pages/about.js"
import { NotFoundView } from "modules/pages/404.js";
import { MainUser } from "modules/user/User.js";

const routes: Route[] = [
	{ path: "/",			viewName: "start-view",		templateId: "start-template" },
	{ path: "/login",		viewName: "login-view",		templateId: "login-template" },
	{ path: "/lobby",		viewName: "lobby-view",		templateId: "lobby-template" },
	{ path: "/profile",		viewName: "profile-view",	templateId: "profile-template" },
	{ path: "/settings",	viewName: "settings-view",	templateId: "settings-template" },
	{ path: "/search",		viewName: "search-view",	templateId: "search-template" },
	{ path: "/about",		viewName: "about-view",		templateId: "about-template" },
	{ path: "*",			viewName: "notfound-view",	templateId: "notfound-template" },
]

customElements.define('view-component', ViewComponent);
customElements.define('start-view', StartView);
customElements.define('login-view', LoginView);
customElements.define('lobby-view', LobbyView);
customElements.define('settings-view', SettingsView);
customElements.define('profile-view', ProfileView);
customElements.define('search-view', SearchView);
customElements.define('about-view', AboutView);
customElements.define('notfound-view', NotFoundView);

const user = new MainUser();
await user.loginSession();

var defaultTheme = "onedark";
const themeCookie = utils.getCookie("theme");
if (themeCookie)
	defaultTheme = themeCookie;

const themes = await loadTheme();
new ThemeController(themes, defaultTheme);

const router = new Router(routes);
await router.init();

user.onLogout(() => Router.Instance?.navigateTo("/"));

const state = utils.getCookie("crt_state");
if (state)
	utils.toggleCrtEffect(state === 'true');

