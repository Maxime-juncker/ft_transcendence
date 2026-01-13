import { Router } from "modules/router/Router.js";
import { ViewComponent } from "modules/router/ViewComponent.js";
import { MainUser } from "modules/user/User.js";

export class HeaderSmall
{
	private m_searchInput: HTMLInputElement | null = null;
	// private m_user: MainUser;

	constructor(user: MainUser, view: ViewComponent, parentId: string)
	{
		
		const parent = view.querySelector(`#${parentId}`);
		if (!parent)
		{
			console.warn("parent not found");
			return;
		}
		parent.innerHTML = "";

		const template = document.getElementById("header-small-template") as HTMLTemplateElement;
		if (!template)
		{
			console.warn("no header-small-template found");
			return ;
		}

		const clone = template.content.cloneNode(true) as HTMLElement;

		user.setHtml(clone.querySelector("#user-container"));
		this.m_searchInput = clone.querySelector("#search-input");
		const userMenuContainer = clone.querySelector("#user-menu-container");
		view.addTrackListener(clone.querySelector("#banner"), "click", () => {
			userMenuContainer?.classList.add("hide");
			Router.Instance?.navigateTo("/")
		});

		view.addTrackListener(clone.querySelector("#logout_btn"), "click", () => {
			userMenuContainer?.classList.add("hide");
			user.logout()
		});

		view.addTrackListener(clone.querySelector("#profile_btn"), "click", () => {
			userMenuContainer?.classList.add("hide");
			Router.Instance?.navigateTo("/profile")
		});

		view.addTrackListener(clone.querySelector("#settings_btn"), "click", () => {
			userMenuContainer?.classList.add("hide");
			Router.Instance?.navigateTo("/settings")
		});

		view.addTrackListener(clone.querySelector("#about_btn"), "click", () => {
			userMenuContainer?.classList.add("hide");
			Router.Instance?.navigateTo("/about")
		});

		view.addTrackListener(clone.querySelector("#user-menu-btn"), 'click', () => {
			userMenuContainer?.classList.toggle("hide");
		});

		view.addTrackListener(this.m_searchInput, "keypress", (e) => this.searchUser(e));

		parent.append(clone);

	}

	private searchUser(event: any)
	{
		if (event.key == 'Enter' && this.m_searchInput && this.m_searchInput.value != "")
		{
			Router.Instance?.navigateTo(`/search?query=${this.m_searchInput.value}`);
			this.m_searchInput.value = "";
		}
	}

}
