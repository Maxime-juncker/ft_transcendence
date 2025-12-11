import { hashString } from 'sha256.js'
import { MainUser } from './User.js';
import { setPlaceHolderText } from 'utils.js';
import { ViewComponent } from 'ViewComponent.js';
import { Router } from 'app.js';

export class LoginView extends ViewComponent
{
	private m_user: MainUser;

	constructor()
	{
		super();
	}

	public async enable()
	{
		this.m_user = new MainUser(null);
		await this.m_user.loginSession();
		if (this.m_user.id != -1)
			Router.Instance.navigateTo("/lobby");

		this.m_user.onLogin((user) => { Router.Instance.navigateTo("/lobby") })

		this.querySelector("#create_btn")?.addEventListener("click", () => this.submitNewUser());
		this.querySelector("#login_btn")?.addEventListener('click', () => this.login());
		this.querySelector("#forty_two_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/forty_two"));
		this.querySelector("#github_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/github"));
		this.querySelector("#guest_log_btn")?.addEventListener("click", () => this.logAsGuest());

		this.querySelector("#home_btn")?.addEventListener("click", () => { 
			Router.Instance.navigateTo("/");
		});

		setInterval(() => this.m_user.refreshSelf(), 60000);
	}

	private async login()
	{
		var	emailInput = this.querySelector("#login_email") as HTMLInputElement;
		var	passwInput = this.querySelector("#login_passw") as HTMLInputElement;
		var totpInput = this.querySelector("#login_totp") as HTMLInputElement;

		const { status, data } = await this.m_user.login(emailInput.value, passwInput.value, totpInput.value);
		if (status == -1)
		{
			setPlaceHolderText("please logout first.");
			return ;
		}

		if (status == 404)
			setPlaceHolderText("passw or email or totp invalid");
		else if (status == 500) 
			setPlaceHolderText("database error");
	}

	private async logAsGuest()
	{
		const res = await fetch("/api/user/create_guest", {
			method: "POST",
		})

		if (res.status == 200)
		{
			this.m_user.loginSession();
		}
	}

	private async submitNewUser()
	{
		var		email = (<HTMLInputElement>this.querySelector("#create_email")).value;
		var		passw = (<HTMLInputElement>this.querySelector("#create_passw")).value;
		var		username = (<HTMLInputElement>this.querySelector("#create_username")).value;

		if (email == "" || passw == "" || username == "")
		{
			setPlaceHolderText("some field are empty");
			return ;
		}

		const response = await fetch("/api/user/create", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				email: email,
				passw: await hashString(passw),
				username: username,
			})
		});
		if (response.status == 200)
			setPlaceHolderText("user created");
		else if (response.status == 403)
			setPlaceHolderText("email invalid");
		else 
			setPlaceHolderText("database error");
	}
}



function oauthLogin(path: string)
{
	window.location.href = (`${window.location.origin}${path}`);
}

