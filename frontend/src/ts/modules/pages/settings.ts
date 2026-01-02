import { AuthSource, MainUser } from "modules/user/User.js"
import { hashString } from "modules/utils/sha256.js";
import { setPlaceHolderText } from "modules/utils/utils.js";
import { ViewComponent } from "modules/router/ViewComponent.js";
import { Router } from "modules/router/Router.js"

export class SettingsView extends ViewComponent
{
	private m_user: MainUser | null = null;

	private usernameInput:		HTMLInputElement | null = null;
	private emailInput:			HTMLInputElement | null = null;
	private currPassInput:		HTMLInputElement | null = null;
	private newPassInput:		HTMLInputElement | null = null;
	private avatarInput:		HTMLInputElement | null = null;
	private request2faBtn:		HTMLButtonElement | null = null;
	private confirm2faInput:	HTMLInputElement | null = null;
	private logoutBtn:			HTMLButtonElement | null = null;
	private delete2faBtn:		HTMLButtonElement | null = null;
	private resetBtn:			HTMLButtonElement | null = null;
	private deleteBtn:			HTMLButtonElement | null = null;
	private holder:				HTMLElement | null = null;
	private holderParent:		HTMLElement | null = null;
	private holderClose:		HTMLElement | null = null;
	private saveBtn:			HTMLButtonElement | null = null;
	
	constructor()
	{
		super();
	}

	public async enable()
	{
		this.m_user = new MainUser(this.querySelector("#user-container"));
		await this.m_user.loginSession();
		this.m_user.onLogout((user) => { Router.Instance?.navigateTo("/") })
		if (this.m_user.id == -1) // user not login
		{
			Router.Instance?.navigateTo("/");
			return ;
		}

		this.addTrackListener(this.querySelector("#banner"), "click", () => Router.Instance?.navigateTo("/"));
		this.addTrackListener(this.querySelector("#logout_btn"), "click", () => this.m_user?.logout());
		this.addTrackListener(this.querySelector("#profile_btn"), "click", () => Router.Instance?.navigateTo("/profile"));
		this.addTrackListener(this.querySelector("#settings_btn"), "click", () => Router.Instance?.navigateTo("/settings"));
		this.addTrackListener(this.querySelector("#user-menu-btn"), 'click', () => {
			const container = this.querySelector("#user-menu-container");
			if (container)
				container.classList.toggle("hide");
		});

		this.usernameInput = this.querySelector("#username-input") as HTMLInputElement;
		this.emailInput = this.querySelector("#email-input") as HTMLInputElement;
		this.currPassInput = this.querySelector("#curr-passw-input") as HTMLInputElement;
		this.newPassInput = this.querySelector("#new-passw-input") as HTMLInputElement;
		this.avatarInput = this.querySelector("#avatar-input") as HTMLInputElement;
		this.request2faBtn = this.querySelector("#request-2fa-btn") as HTMLButtonElement;
		this.confirm2faInput = this.querySelector("#confirm-2fa-input") as HTMLInputElement;
		this.logoutBtn = this.querySelector("#settings-logout-btn") as HTMLButtonElement;
		this.delete2faBtn = this.querySelector("#delete-2fa-btn") as HTMLButtonElement;
		this.resetBtn = this.querySelector("#reset-btn") as HTMLButtonElement;
		this.deleteBtn = this.querySelector("#delete-btn") as HTMLButtonElement;
		this.holder = this.querySelector('#qrcode_holder') as HTMLElement;
		this.holderParent = this.holder.parentNode as HTMLElement;
		this.holderClose = this.querySelector("#holder-close-btn") as HTMLElement;

		this.saveBtn = this.querySelector("#save-btn") as HTMLButtonElement;

		this.usernameInput.placeholder = this.m_user.name;
		this.emailInput.placeholder = this.m_user.getEmail();

		this.addTrackListener(this.request2faBtn, "click", () => { this.new_totp(); setPlaceHolderText("scan qrcode with auth app and confirm code") });
		this.addTrackListener(this.delete2faBtn, "click", () => { this.m_user?.delTotp(); setPlaceHolderText("2fa has been removed") });
		this.addTrackListener(this.logoutBtn, "click", () => this.m_user?.logout());
		this.addTrackListener(this.saveBtn, "click", () => this.confirmChange());
		this.addTrackListener(this.holderClose, "click", () => this.holderParent?.classList.add("hide"));
		this.addTrackListener(this.deleteBtn, "click", () => this.showConfirmPanel(() => this.m_user?.deleteUser()));
		this.addTrackListener(this.resetBtn, "click", () => this.showConfirmPanel(() => {
			if (this.m_user?.resetUser())
				setPlaceHolderText("all data has been reset");
			else
				setPlaceHolderText("error");
			const panel = this.querySelector("#panel-holder");
			if (panel)
				panel.innerHTML = "";
		}));

		this.hideForbiddenElement();
	}

	public async disable()
	{
		const container = this.querySelector("#user-container");
		if (container)
			container.innerHTML = "";
		if (this.m_user)
		{
			this.m_user.resetCallbacks();
			this.m_user = null;
		}
	}

	private hideForbiddenElement()
	{
		if (!this.m_user || !this.delete2faBtn)
			return ;

		if (this.m_user.source !== AuthSource.INTERNAL)
		{
			(<HTMLElement>this.querySelector("#email-settings")).style.display = "none";
			(<HTMLElement>this.querySelector("#passw-settings")).style.display = "none";
			(<HTMLElement>this.querySelector("#settings-2fa")).style.display = "none";
			this.delete2faBtn.style.display = "none";
			return ;
		}
	}

	private async confirmChange()
	{
		if (!this.m_user)
			return ;

		var error: boolean = false;

		if (this.confirm2faInput && this.confirm2faInput.value !== "")
			this.validate_totp(this.m_user);

		if (this.avatarInput && this.avatarInput.files && this.avatarInput.files[0])
		{
			console.log("updating avatar");
			const file = this.avatarInput.files[0];
			const formData = new FormData();
			formData.append('avatar', file);
			this.m_user.setAvatar(formData);
		}

		if (this.newPassInput && this.currPassInput && 
			this.newPassInput.value !== "" && this.currPassInput.value !== "")
		{
			console.log("updating password");
			const res = await fetch("/api/user/update/passw", {
				method: "POST",
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					oldPass: await hashString(this.currPassInput.value),
					newPass: await hashString(this.newPassInput.value)
				})
			});
			const data = await res.json();
			if (res.status != 200)
			{
				error = true;
				setPlaceHolderText(`error: ${data.message}`);
			}
			console.log(res.status, data);
		}

		if (this.usernameInput && this.usernameInput.value !== "")
		{
			console.log("updating name");
			const res = await fetch("/api/user/update/name", {
				method: "POST",
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					name: this.usernameInput.value
				})
			});
			const data = await res.json();
			if (res.status != 200)
			{
				error = true;
				setPlaceHolderText(`error: ${data.message}`);
			}
			console.log(res.status, data);
		}

		if (this.emailInput && this.emailInput.value !== "")
		{
			console.log("updating email");
			const res = await fetch("/api/user/update/email", {
				method: "POST",
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					email: this.emailInput.value
				})
			});
			const data = await res.json();
			if (res.status != 200)
			{
				error = true;
				setPlaceHolderText(`error: ${data.message}`);
			}
			console.log(res.status, data);
		}

		if (error === false)
			setPlaceHolderText(`settings saved!`);

		await this.m_user.refreshSelf();
	}

	private async new_totp()
	{
		if (!this.m_user)
			return ;

		const result = await this.m_user.newTotp();
		if (!result || !this.holderParent || !this.holder)
			return ;

		const { status, data } = result;
		this.holderParent.classList.remove("hide");
		var qrcode = data.qrcode;
		if (!qrcode)
			return ;

		const img = document.createElement('img');
		img.id = "qrcode_img"
		img.src = qrcode;
		img.alt = "TOTP qrcode";
		this.holder.innerHTML = "";
		this.holder.appendChild(img);
		console.log(status, JSON.stringify(data));
	}

	private showConfirmPanel(fn: () => any)
	{
		const template = this.querySelector("#confirm-panel-template") as HTMLTemplateElement;
		const holder = this.querySelector("#panel-holder") as HTMLElement;

		holder.innerHTML = "";

		const clone = template.content.cloneNode(true) as HTMLElement;
		const cancelBtn = clone.querySelector("#cancel-btn") as HTMLButtonElement;
		const confirmIn = clone.querySelector("#confirm-input") as HTMLInputElement;
		if (!cancelBtn || !confirmIn)
			return ;

		cancelBtn.addEventListener("click", () => { holder.innerHTML = "" });
		confirmIn.addEventListener("keypress", (e: KeyboardEvent) => {
			const target = e.target as HTMLInputElement;
			if (e.key == "Enter" && target.value != "")
			{
				if (target.value === "confirm")
				{
					console.log("haaaa")
					fn();
				}
			}
		})
		holder.append(clone);
	}

	private async validate_totp(user: MainUser)
	{
		var totp = this.querySelector("#confirm-2fa-input") as HTMLInputElement;

		const status = await user.validateTotp(totp.value);

		switch(status)
		{
			case 200:
				console.log("Totp validated");
				const img = this.querySelector("#qrcode_img");
				if (img)
					img.remove();
				break;
			default:
				console.log("Unknow error");
				break;
		}
	}
}

