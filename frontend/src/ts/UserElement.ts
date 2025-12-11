import { User, UserStatus } from "./User.js";
import { Router } from "app.js";

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
	private m_htmlAvatar:		HTMLImageElement;
	private m_htmlStatusImg:	HTMLImageElement;
	private m_htmlName:			HTMLElement;
	private m_clone:			HTMLElement;
	private	m_user:				User;
	private m_type:				UserElementType;

	constructor(user: User, parent: HTMLElement, type: UserElementType, templateName: string = "user-profile-template")
	{
		this.m_user = null;
		this.m_type = type;

		const template = Router.getElementById(templateName) as HTMLTemplateElement;
		if (!template)
		{
			console.error("no template found for user element");
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

		parent.prepend(this.m_clone);
		this.m_clone = parent.firstElementChild as HTMLElement;
		this.updateHtml(user);
	}

	public getElement(id: string) : HTMLElement
	{
		return this.m_clone.querySelector(id);
	}

	public get clone()	{ return this.m_clone; }
	public get user()	{ return this.m_user; }
	public get type()	{ return this.m_type; }

	public static setStatusColor(user: User, statusElt: HTMLElement)
	{
		if (!user)
		{
			statusElt.style.background = "black:"
			return ;
		}
		switch (user.getStatus())
		{
			case UserStatus.UNKNOW:
				statusElt.style.background = "black";
				break;
			case UserStatus.UNAVAILABLE:
				statusElt.style.background = "gray";
				break;
			case UserStatus.AVAILABLE:
				statusElt.style.background = "green";
				break;
			case UserStatus.BUSY:
				statusElt.style.background = "red";
				break;
			case UserStatus.INVISIBLE:
				statusElt.style.background = "gray";
				break;
			case UserStatus.IN_GAME:
				statusElt.style.background = "blue";
				break;
			default:
				break;
		}
	}

	public updateHtml(user: User) : void
	{
		UserElement.setStatusColor(user, this.m_htmlStatusImg);
		if (!user)
		{
			this.m_htmlAvatar.src = "/public/avatars/default.png";
			this.m_htmlName.innerText = "guest";
			return ;
		}

		this.m_htmlAvatar.src = user.getAvatarPath();
		this.m_htmlName.innerText = user.name;
		this.m_user = user;
	}
}
