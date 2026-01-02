import { hashString } from 'sha256.js'
import { MainUser } from './User.js';
import { setCookie, setPlaceHolderText, getUrlVar } from 'utils.js';
import { ViewComponent } from 'ViewComponent.js';
import { Router } from 'app.js';

export class LoginView extends ViewComponent
{
	private m_user: MainUser;

	constructor()
	{
		super();
		this.m_user = new MainUser(null);
	}

	public async enable()
	{
		const vars = getUrlVar();
		if (vars.get("oauth_token"))
		{
			console.log("session:", vars.get("oauth_token"))
			setCookie("jwt_session", vars.get("oauth_token"), 10);
			window.history.replaceState({}, document.title, "/login");
		}

		await this.m_user.loginSession();
		if (this.m_user.id != -1)
		{
			if (Router.Instance?.prevView && Router.Instance.prevView.routePath == "/lobby")
				Router.Instance.navigateTo("/");
			else
				Router.Instance?.navigateTo("/lobby");
		}

		this.m_user.onLogin((user) => { Router.Instance?.navigateTo("/lobby") })

		this.addTrackListener(this.querySelector("#create_btn"), "click", () => this.submitNewUser());
		this.addTrackListener(this.querySelector("#login_btn"), 'click', () => this.login());
		this.addTrackListener(this.querySelector("#forty_two_log_btn"), "click", () => oauthLogin("/api/oauth2/forty_two"));
		this.addTrackListener(this.querySelector("#github_log_btn"), "click", () => oauthLogin("/api/oauth2/github"));
		this.addTrackListener(this.querySelector("#guest_log_btn"), "click", () => this.logAsGuest());

		this.addTrackListener(this.querySelector("#home_btn"), "click", () => { 
			Router.Instance?.navigateTo("/");
		});
	}

	public async disable()
	{
		if (this.m_user)
		{
			this.m_user.resetCallbacks();
		}
	}

	private async login()
	{
		var	emailInput = this.querySelector("#login_email") as HTMLInputElement;
		var	passwInput = this.querySelector("#login_passw") as HTMLInputElement;
		var totpInput = this.querySelector("#login_totp") as HTMLInputElement;

		const { status, data } = await this.m_user.login(emailInput.value, passwInput.value, totpInput.value);
		if (status == 200)
		{
			console.log("session:", data.token)
			setCookie("jwt_session", data.token, 10);
		}
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

		const data = await res.json();
		if (res.status == 200)
		{
			console.log("session:", data.token)
			setCookie("jwt_session", data.token, 10);
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

