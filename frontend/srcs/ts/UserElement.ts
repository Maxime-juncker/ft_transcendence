import { User, UserStatus } from "./User.js";

export enum UserElementType
{
	MAIN = 0,			// enable logout / settings btn
	STANDARD,			//
	FRIEND				// enable remove / accept btn
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
	private m_htmlLogoutBtn:	HTMLButtonElement;
	private m_htmlSettingsBtn:	HTMLButtonElement;
	private m_htmlFriendBtn:	HTMLButtonElement;
	private m_htmlStatusSelect:	HTMLSelectElement;

	constructor(user:User, parent:HTMLElement, type:UserElementType)
	{
		this.m_htmlContainer = document.createElement("div");
		this.m_htmlContainer.className = "user-container";

		this.m_htmlStatusImg = document.createElement("img");
		this.m_htmlStatusImg.className = "user-status";

		this.m_htmlAvatar = document.createElement("img");
		this.m_htmlAvatar.className = "user-avatar";

		this.m_htmlName = document.createElement("h3")
		
		this.m_htmlStatusSelect = document.createElement("select")

		this.m_htmlStatusSelect.prepend(newOption("available"));
		this.m_htmlStatusSelect.prepend(newOption("unavailable"));
		this.m_htmlStatusSelect.prepend(newOption("busy"));
		this.m_htmlStatusSelect.prepend(newOption("in_game"));

		this.m_htmlBtnContainer = document.createElement("div");
		this.m_htmlLogoutBtn = document.createElement("button");
		this.m_htmlLogoutBtn.innerText = "logout";
		this.m_htmlSettingsBtn = document.createElement("button");
		this.m_htmlSettingsBtn.innerText = "settings";
		this.m_htmlFriendBtn = document.createElement("button");
		this.m_htmlFriendBtn.innerText = "remove";

		this.m_htmlContainer.prepend(this.m_htmlStatusImg);
		this.m_htmlContainer.prepend(this.m_htmlBtnContainer);
		this.m_htmlContainer.prepend(this.m_htmlName);
		this.m_htmlContainer.prepend(this.m_htmlAvatar);

		parent.prepend(this.m_htmlContainer);

		this.setType(type);
		this.updateHtml(user);
	}

	public getLogoutBtn():		HTMLButtonElement { return this.m_htmlLogoutBtn; }
	public getSettingsBtn():	HTMLButtonElement { return this.m_htmlSettingsBtn; }
	public getFriendBtn():		HTMLButtonElement { return this.m_htmlFriendBtn; }
	public getStatusSelect():	HTMLSelectElement { return this.m_htmlStatusSelect; }

	public setType(type: UserElementType)
	{
		switch (type) {
			case UserElementType.MAIN:
				this.m_htmlBtnContainer.prepend(this.m_htmlStatusSelect);
				this.m_htmlBtnContainer.prepend(this.m_htmlSettingsBtn);	
				this.m_htmlBtnContainer.prepend(this.m_htmlLogoutBtn);	
				break;
			case UserElementType.FRIEND:
				this.m_htmlBtnContainer.prepend(this.m_htmlFriendBtn);	
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
