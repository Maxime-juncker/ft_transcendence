import { User, UserStatus } from "./User.js";

export enum UserElementType
{
	MAIN = 0,			// enable logout / settings btn
	STANDARD,			//
	FRIEND,				// enable remove btn
	FRIEND_PNDG,		// enable remove / accept btn
}

function newOption(optionName: string) : HTMLOptionElement
{
	var option: HTMLOptionElement;

	option = document.createElement("option");
	option.innerText = optionName;
	option.value = optionName;
	return option;
}

export class UserElement
{
	private m_htmlAvatar:		HTMLImageElement;
	private m_htmlStatusImg:	HTMLImageElement;
	private m_htmlName:			HTMLElement;
	private m_htmlContainer:	HTMLElement;

	private m_htmlBtnContainer:	HTMLElement;
	private m_htmlBtn1:			HTMLButtonElement;
	private m_htmlBtn2:			HTMLButtonElement;
	private m_htmlBtn3:			HTMLButtonElement;
	private m_htmlStatusSelect:	HTMLSelectElement;

	constructor(user:User, parent:HTMLElement, type:UserElementType)
	{
		this.m_htmlContainer = document.createElement("div");
		this.m_htmlContainer.className = "user-container";

		this.m_htmlStatusImg = document.createElement("img");
		this.m_htmlStatusImg.className = "user-status";

		this.m_htmlAvatar = document.createElement("img");
		this.m_htmlAvatar.className = "user-avatar";

		this.m_htmlName = document.createElement("p")
		
		this.m_htmlStatusSelect = document.createElement("select")

		this.m_htmlStatusSelect.prepend(newOption("available"));
		this.m_htmlStatusSelect.prepend(newOption("unavailable"));
		this.m_htmlStatusSelect.prepend(newOption("busy"));
		this.m_htmlStatusSelect.prepend(newOption("in_game"));

		this.m_htmlBtnContainer = document.createElement("div");
		this.m_htmlBtn1 = document.createElement("button");
		this.m_htmlBtn2 = document.createElement("button");
		this.m_htmlBtn3 = document.createElement("button");

		this.m_htmlContainer.prepend(this.m_htmlStatusImg);
		this.m_htmlContainer.prepend(this.m_htmlBtnContainer);
		this.m_htmlContainer.prepend(this.m_htmlName);
		this.m_htmlContainer.prepend(this.m_htmlAvatar);

		parent.prepend(this.m_htmlContainer);

		this.setType(type);
		this.updateHtml(user);
	}

	public getBtn1():			HTMLButtonElement { return this.m_htmlBtn1; }
	public getBtn2():			HTMLButtonElement { return this.m_htmlBtn2; }
	public getBtn3():			HTMLButtonElement { return this.m_htmlBtn3; }
	public getStatusSelect():	HTMLSelectElement { return this.m_htmlStatusSelect; }

	public setType(type: UserElementType)
	{
		switch (type) {
			case UserElementType.MAIN:
				this.m_htmlBtnContainer.prepend(this.m_htmlStatusSelect);
				this.m_htmlBtnContainer.prepend(this.m_htmlBtn1);	
				this.m_htmlBtn1.innerText = "settings";
				this.m_htmlBtnContainer.prepend(this.m_htmlBtn2);	
				this.m_htmlBtn2.innerText = "logout";
				break;
			case UserElementType.FRIEND:
				this.m_htmlBtnContainer.prepend(this.m_htmlBtn1);	
				this.m_htmlBtn1.innerText = "Remove Friend";
				break;
			case UserElementType.FRIEND_PNDG:
				this.m_htmlBtnContainer.prepend(this.m_htmlBtn1);	
				this.m_htmlBtn1.innerText = "Y";
				this.m_htmlBtnContainer.prepend(this.m_htmlBtn2);	
				this.m_htmlBtn2.innerText = "N";
				break;
			default:
				break;
		}
	}

	public updateHtml(user:User) : void
	{
		if (!user)
		{
			this.m_htmlAvatar.src = ""; // TODO: add default avatar
			this.m_htmlName.innerText = "guest";
			this.m_htmlStatusImg.style.background = "black";
			return ;
		}

		this.m_htmlAvatar.src = user.getAvatarPath();
		this.m_htmlName.innerText = user.name;

		switch (user.getStatus())
		{
			case UserStatus.UNKNOW:
				this.m_htmlStatusImg.style.background = "black";
				break;
			case UserStatus.UNAVAILABLE:
				this.m_htmlStatusImg.style.background = "gray";
				break;
			case UserStatus.AVAILABLE:
				this.m_htmlStatusImg.style.background = "green";
				break;
			case UserStatus.BUSY:
				this.m_htmlStatusImg.style.background = "red";
				break;
			case UserStatus.INVISIBLE:
				this.m_htmlStatusImg.style.background = "gray";
				break;
			case UserStatus.IN_GAME:
				this.m_htmlStatusImg.style.background = "blue";
				break;
			default:
				break;
		}
	}
}
