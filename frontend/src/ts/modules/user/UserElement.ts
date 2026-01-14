import { User, UserStatus } from "modules/user/User.js";
import { Router } from "modules/router/Router.js";

export enum UserElementType
{
	MAIN = 0,			// enable logout / settings btn
	STANDARD,			//
	FRIEND,				// enable remove btn
	FRIEND_PNDG,		// enable remove / accept btn
	REQUEST,			// only show remove btn
}

export class UserElement
{
	private m_htmlAvatar:		HTMLImageElement | null = null;
	private m_htmlStatusImg:	HTMLImageElement | null = null;
	private m_htmlName:			HTMLElement | null = null;
	private m_clone:			HTMLElement | null = null;
	private	m_user:				User | null;
	private m_type:				UserElementType;

	constructor(user: User | null, parent: HTMLElement, type: UserElementType, templateName: string = "user-profile-template", clickRedirect: boolean = true)
	{
		this.m_user = user;
		this.m_type = type;

		const template = document.getElementById(templateName) as HTMLTemplateElement;
		if (!template)
		{
			console.warn("no template found for user element");
			return ;
		}

		this.m_clone = template.content.cloneNode(true) as HTMLElement;

		this.m_htmlAvatar = this.m_clone.querySelector("#avatar-img");
		if (!this.m_htmlAvatar)
			console.warn("no avatar img found");

		this.m_htmlStatusImg = this.m_clone.querySelector("#user-status");
		if (!this.m_htmlStatusImg)
			console.warn("no user status found");

		this.m_htmlName = this.m_clone.querySelector("#avatar-name");
		if (!this.m_htmlName)
			console.warn("no btn username txt found");

		if (user && clickRedirect)
			this.getElement("#profile")?.addEventListener("click", () => { Router.Instance?.navigateTo(`/profile?username=${user.name}`) });

		parent.prepend(this.m_clone);
		this.m_clone = parent.firstElementChild as HTMLElement;
		this.updateHtml(user);
	}

	/**
	 * return a querySelector of id in the element
	 * @param id to search
	 * @returns the element found or null if element is null
	 */
	public getElement(id: string) : HTMLElement | null
	{
		if (!this.m_clone) return null;

		return this.m_clone.querySelector(id);
	}

	public get clone()	{ return this.m_clone; }
	public get user()	{ return this.m_user; }
	public get type()	{ return this.m_type; }

	public static setStatusColor(user: User | null, statusElt: HTMLElement)
	{
		if (!user)
		{
			statusElt.style.background = "black:"
			return ;
		}
		switch (user.status)
		{
			case UserStatus.UNKNOW:
				statusElt.style.background = "var(--color-darker)";
				break;
			case UserStatus.UNAVAILABLE:
				statusElt.style.background = "var(--color-darker)";
				break;
			case UserStatus.AVAILABLE:
				statusElt.style.background = "var(--color-green)";
				break;
			case UserStatus.BUSY:
				statusElt.style.background = "var(--color-red)";
				break;
			case UserStatus.IN_GAME:
				statusElt.style.background = "var(--color-blue)";
				break;
			default:
				break;
		}
	}

	/**
	* update inner html of element with user
	* @param user the user that will be show up
	* @note give null in param to reset element
	*/
	public updateHtml(user: User | null) : void
	{
		if (!this.m_htmlStatusImg || !this.m_htmlAvatar || !this.m_htmlName)
			return ;

		if (!user)
		{
			this.m_htmlStatusImg.style.background = "black:"
			this.m_htmlAvatar.src = "/public/avatars/default.png";
			this.m_htmlName.innerText = "guest";
			return ;
		}

		UserElement.setStatusColor(user, this.m_htmlStatusImg);
		this.m_htmlAvatar.src = user.avatarPath;
		this.m_htmlName.innerText = user.name;
		this.m_user = user;
	}
}
