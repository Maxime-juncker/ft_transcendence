import { AuthSource, MainUser } from "modules/user/User.js"
import { HeaderSmall } from "./HeaderSmall.js";
import { hashString } from "modules/utils/sha256.js";
import { setPlaceHolderText } from "modules/utils/utils.js";
import { ViewComponent } from "modules/router/ViewComponent.js";
import { Router } from "modules/router/Router.js"
import { toggleCrtEffect, getCookie } from "modules/utils/utils.js";
import { ThemeController } from "./Theme.js";

export class SettingsView extends ViewComponent
{
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
	private crtCheckbox:		HTMLInputElement | null = null;
	private themeSelect:		HTMLSelectElement | null = null;
	
	constructor()
	{
		super();
	}

	public async enable()
	{
		if (!MainUser.Instance)
			return;

		if (MainUser.Instance.id == -1)
		{
			Router.Instance?.navigateTo("/");
			return ;
		}

		new HeaderSmall(MainUser.Instance, this, "header-container");

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
		this.crtCheckbox = this.querySelector("#crt-checkbox") as HTMLInputElement;
		this.themeSelect = this.querySelector("#theme-select") as HTMLSelectElement;

		this.saveBtn = this.querySelector("#save-btn") as HTMLButtonElement;

		this.usernameInput.placeholder = MainUser.Instance.name;
		this.emailInput.placeholder = MainUser.Instance.email;

		this.addTrackListener(this.request2faBtn, "click", () => { this.new_totp(); setPlaceHolderText("scan qrcode with auth app and confirm code") });
		this.addTrackListener(this.logoutBtn, "click", () => MainUser.Instance?.logout());
		this.addTrackListener(this.saveBtn, "click", () => this.confirmChange());
		this.addTrackListener(this.holderClose, "click", () => this.holderParent?.classList.add("hide"));
		this.addTrackListener(this.delete2faBtn, "click", () => this.showConfirmPanel(() => {
			MainUser.Instance?.delTotp();
			setPlaceHolderText("2fa has been removed")
			const panel = this.querySelector("#panel-holder");
			if (panel)
				panel.innerHTML = "";
		}));
		this.addTrackListener(this.deleteBtn, "click", () => this.showConfirmPanel(() => MainUser.Instance?.deleteUser()));
		this.addTrackListener(this.resetBtn, "click", () => this.showConfirmPanel(() => {
			if (MainUser.Instance?.resetUser())
				setPlaceHolderText("all data has been reset");
			else
				setPlaceHolderText("error");
			const panel = this.querySelector("#panel-holder");
			if (panel)
				panel.innerHTML = "";
		}));

		const state = getCookie("crt_state");
		if (state)
		{
			this.crtCheckbox.checked = !(state === 'true');
		}

		this.addTrackListener(this.crtCheckbox, "change", (e: any) => {
			const target = e.target as HTMLInputElement;
			toggleCrtEffect(!target.checked);
		})

		if (this.themeSelect)
		{
			this.themeSelect.value = ThemeController.Instance ? ThemeController.Instance.themeName : "onedark";
			this.themeSelect.addEventListener("change", () => { if (this.themeSelect)
				{
					ThemeController.Instance?.setGlobalTheme(this.themeSelect.value);
				}
			});
		}

		this.hideForbiddenElement();
	}


	public async disable()
	{
		this.clearTrackListener();
		const container = this.querySelector("#user-container");
		if (container)
			container.innerHTML = "";
	}

	private hideForbiddenElement()
	{
		if (!MainUser.Instance || !this.delete2faBtn)
			return ;

		if (MainUser.Instance.source !== AuthSource.INTERNAL)
		{
			(<HTMLElement>this.querySelector("#email-settings")).style.display = "none";
			(<HTMLElement>this.querySelector("#passw-settings")).style.display = "none";
			(<HTMLElement>this.querySelector("#settings-2fa")).style.display = "none";
			this.delete2faBtn.style.display = "none";
		}
		else
		{
			(<HTMLElement>this.querySelector("#email-settings")).style.display = "block";
			(<HTMLElement>this.querySelector("#passw-settings")).style.display = "flex";
			(<HTMLElement>this.querySelector("#settings-2fa")).style.display = "flex";
			this.delete2faBtn.style.display = "block";
		}
	}

	private async updatePassw(newPassw: string, oldPass: string): Promise<{ code: number, data: any }>
	{
		if (newPassw == "" && oldPass == "")
			return { code: 0, data: "ok" };
		if (newPassw == "" || oldPass == "" || !MainUser.Instance)
		{
			return { code: 1, data: "error: some password field is empty" };
		}
		console.log("updating password");
		const res = await fetch("/api/user/update/passw", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				token: MainUser.Instance.token,
				oldPass: await hashString(oldPass),
				newPass: await hashString(newPassw)
			})
		});
		const data = await res.json();
		if (res.status != 200)
		{
			return { code: 0, data: data.message };
		}
		return { code: 1, data: data.message };
	}

	private async confirmChange()
	{
		if (!MainUser.Instance)
			return ;

		var message = ""

		if (this.confirm2faInput && this.confirm2faInput.value !== "")
		{
			const res = await this.validate_totp();
			if (res == -1)
				message += "2fa activation failed (check code)\n";
		}

		if (this.avatarInput && this.avatarInput.files && this.avatarInput.files[0])
		{
			console.log("updating avatar");
			const file = this.avatarInput.files[0];
			const formData = new FormData();
			formData.append('avatar', file);
			MainUser.Instance.setAvatar(formData);
		}

		if (this.newPassInput && this.currPassInput)
		{
			const retval = await this.updatePassw(this.newPassInput.value, this.currPassInput.value);
			if (retval.code != 0)
				message += retval.data + '\n';
		}

		if (this.usernameInput && this.usernameInput.value !== "")
		{
			const res = await fetch("/api/user/update/name", {
				method: "POST",
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					token: MainUser.Instance.token,
					name: this.usernameInput.value
				})
			});
			const data = await res.json();
			if (res.status != 200)
			{
				message += `${data.message}\n`;
			}
		}

		if (this.emailInput && this.emailInput.value !== "")
		{
			const res = await fetch("/api/user/update/email", {
				method: "POST",
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					token: MainUser.Instance.token,
					email: this.emailInput.value
				})
			});
			const data = await res.json();
			if (res.status != 200)
			{
				message += `${data.message}\n`;
			}
		}
		if (message == "")
			setPlaceHolderText("settings saved!");
		else
			setPlaceHolderText(message);

		await MainUser.Instance.refreshSelf();
	}

	private async new_totp()
	{
		if (!MainUser.Instance)
			return ;

		const result = await MainUser.Instance.newTotp();
		if (!result || !this.holderParent || !this.holder)
			return ;

		const { status, data } = result;
		void status;
		this.holderParent.classList.remove("hide");
		if (this.holderClose)
			this.holderClose.style.display = "block";
		var qrcode = data.qrcode;
		if (!qrcode)
			return ;

		const img = document.createElement('img');
		img.id = "qrcode_img"
		img.src = qrcode;
		img.alt = "TOTP qrcode";
		this.holder.innerHTML = "";
		this.holder.appendChild(img);
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
					fn();
					const holder = this.querySelector("#panel-holder") as HTMLElement;
					holder.innerHTML = "";
				}
			}
		})
		holder.append(clone);
		window.dispatchEvent(new CustomEvent('pageChanged'));
	}

	private async validate_totp(): Promise<number>
	{
		if (!MainUser.Instance)
			return -1;

		var totp = this.querySelector("#confirm-2fa-input") as HTMLInputElement;
		const status = await MainUser.Instance.validateTotp(totp.value);

		switch(status)
		{
			case 200:
				console.log("Totp validated");
				if (this.holderClose)
					this.holderClose.style.display = "none";
				const img = this.querySelector("#qrcode_img");
				if (img)
					img.remove();
				break;
			default:
				console.log("Unknow error");
				return -1;
		}
		return 0;
	}
}

