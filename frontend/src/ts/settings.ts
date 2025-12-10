import { AuthSource, MainUser } from "User.js"
import { hashString } from "sha256.js";
import { setPlaceHolderText } from "utils.js";
import { ViewComponent } from "ViewComponent.js";
import { Router } from "app.js"

export class SettingsView extends ViewComponent
{
	private m_user: MainUser;

	private usernameInput:		HTMLInputElement;
	private emailInput:			HTMLInputElement;
	private currPassInput:		HTMLInputElement;
	private newPassInput:		HTMLInputElement;
	private avatarInput:		HTMLInputElement;
	private request2faBtn:		HTMLButtonElement;
	private confirm2faInput:	HTMLInputElement;
	private logoutBtn:			HTMLButtonElement;
	private delete2faBtn:		HTMLButtonElement;
	private resetBtn:			HTMLButtonElement;
	private deleteBtn:			HTMLButtonElement;
	private holder:				HTMLElement;
	private holderParent:		HTMLElement;
	private holderClose:		HTMLElement;
	private saveBtn:			HTMLButtonElement;
	
	constructor()
	{
		super();
	}

	public async enable()
	{
		this.m_user = new MainUser(document.getElementById("user-container"));
		await this.m_user.loginSession();
		this.m_user.onLogout((user) => { Router.Instance.navigateTo("/") })
		if (this.m_user.id == -1) // user not login
			Router.Instance.navigateTo("/");

		document.getElementById("banner")?.addEventListener("click", () => Router.Instance.navigateTo("/"));
		document.getElementById("logout_btn")?.addEventListener("click", () => this.m_user.logout());
		document.getElementById("profile_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/profile"));
		document.getElementById("settings_btn")?.addEventListener("click", () => Router.Instance.navigateTo("/settings"));
		document.getElementById("user-menu-btn").addEventListener('click', () => {
			document.getElementById("user-menu-container").classList.toggle("hide");
		});

		this.usernameInput = document.getElementById("username-input") as HTMLInputElement;
		this.emailInput = document.getElementById("email-input") as HTMLInputElement;
		this.currPassInput = document.getElementById("curr-passw-input") as HTMLInputElement;
		this.newPassInput = document.getElementById("new-passw-input") as HTMLInputElement;
		this.avatarInput = document.getElementById("avatar-input") as HTMLInputElement;
		this.request2faBtn = document.getElementById("request-2fa-btn") as HTMLButtonElement;
		this.confirm2faInput = document.getElementById("confirm-2fa-input") as HTMLInputElement;
		this.logoutBtn = document.getElementById("settings-logout-btn") as HTMLButtonElement;
		this.delete2faBtn = document.getElementById("delete-2fa-btn") as HTMLButtonElement;
		this.resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;
		this.deleteBtn = document.getElementById("delete-btn") as HTMLButtonElement;
		this.holder = document.getElementById('qrcode_holder') as HTMLElement;
		this.holderParent = this.holder.parentNode as HTMLElement;
		this.holderClose = document.getElementById("holder-close-btn") as HTMLElement;

		this.saveBtn = document.getElementById("save-btn") as HTMLButtonElement;

		this.usernameInput.placeholder = this.m_user.name;
		this.emailInput.placeholder = this.m_user.getEmail();

		this.request2faBtn.addEventListener("click", () => { this.new_totp(); setPlaceHolderText("scan qrcode with auth app and confirm code") });
		this.delete2faBtn.addEventListener("click", () => { this.m_user.delTotp(); setPlaceHolderText("2fa has been removed") });
		this.logoutBtn.addEventListener("click", () => this.m_user.logout());
		this.saveBtn.addEventListener("click", () => this.confirmChange());
		this.holderClose.addEventListener("click", () => this.holderParent.classList.add("hide"));
		this.deleteBtn.addEventListener("click", () => showConfirmPanel(() => this.m_user.deleteUser()));
		this.resetBtn.addEventListener("click", () => showConfirmPanel(() => {
			if (this.m_user.resetUser())
				setPlaceHolderText("all data has been reset");
			else
				setPlaceHolderText("error");
			document.getElementById("panel-holder").innerHTML = "";
		}));

		this.hideForbiddenElement();
	}

	private hideForbiddenElement()
	{
		if (this.m_user.source !== AuthSource.INTERNAL)
		{
			document.getElementById("email-settings").style.display = "none";
			document.getElementById("passw-settings").style.display = "none";
			document.getElementById("2fa-settings").style.display = "none";
			this.delete2faBtn.style.display = "none";
			return ;
		}
	}

	private async confirmChange()
	{
		var error: boolean = false;

		if (this.confirm2faInput.value !== "")
			validate_totp(this.m_user);

		if (this.avatarInput.files && this.avatarInput.files[0])
		{
			console.log("updating avatar");
			const file = this.avatarInput.files[0];
			const formData = new FormData();
			formData.append('avatar', file);
			this.m_user.setAvatar(formData);
		}

		if (this.newPassInput.value !== "" && this.currPassInput.value !== "")
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

		if (this.usernameInput.value !== "")
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

		if (this.emailInput.value !== "")
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
		const { status, data } = await this.m_user.newTotp();
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
}

function showConfirmPanel(fn: () => any)
{
	const template = document.getElementById("confirm-panel-template") as HTMLTemplateElement;
	const holder = document.getElementById("panel-holder") as HTMLElement;

	holder.innerHTML = "";
	const clone = template.content.cloneNode(true) as HTMLElement;
	clone.querySelector("#cancel-btn").addEventListener("click", () => { holder.innerHTML = "" });
	clone.querySelector("#confirm-input").addEventListener("keypress", (e: KeyboardEvent) => {
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

async function validate_totp(user: MainUser)
{
	var totp = document.getElementById("confirm-2fa-input") as HTMLInputElement;

	const status = await user.validateTotp(totp.value);

	switch(status)
	{
		case 200:
			console.log("Totp validated");
			const img = document.getElementById("qrcode_img");
			if (img)
				img.remove();
			break;
		default:
			console.log("Unknow error");
			break;
	}
}
