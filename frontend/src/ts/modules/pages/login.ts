import { setCookie, setPlaceHolderText, getUrlVar } from 'modules/utils/utils.js';
import { ViewComponent } from 'modules/router/ViewComponent.js';
import { Router } from 'modules/router/Router.js';
import { MainUser } from 'modules/user/User.js';

export class LoginView extends ViewComponent
{
	constructor()
	{
		super();
	}

	public async init()
	{
		MainUser.Instance?.onLogin(() => {
			if (Router.Instance?.activeView?.routePath === "/login")
				Router.Instance?.navigateTo("/lobby")
		});

		this.querySelector("#create_btn")?.addEventListener("click", () => this.submitNewUser());
		this.querySelector("#login_btn")?.addEventListener("click", () => this.login());
		this.querySelector("#forty_two_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/forty_two"));
		this.querySelector("#github_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/github"));
		this.querySelector("#guest_log_btn")?.addEventListener("click", () => this.logAsGuest());

		this.querySelector("#home_btn")?.addEventListener("click", () => { 
			Router.Instance?.navigateTo("/");
		});
	}

	public async enable()
	{
		const vars = getUrlVar();

		const error = vars.get("error");
		if (error)
		{
			setPlaceHolderText(`error: ${error.replace(/%20/g, ' ')}`);
		}

		if (vars.get("oauth_token"))
		{
			setCookie("jwt_session", vars.get("oauth_token"), 10);
			window.history.replaceState({}, document.title, "/login");
			await MainUser.Instance?.loginSession();
			Router.Instance?.setView("/lobby");
		}
	}

	public async disable()
	{
		this.clearTrackListener();
	}

	private async login()
	{
		if (!MainUser.Instance)
			return;

		var	emailInput = this.querySelector("#login_email") as HTMLInputElement;
		var	passwInput = this.querySelector("#login_passw") as HTMLInputElement;
		var totpInput = this.querySelector("#login_totp") as HTMLInputElement;

		const { status, data } = await MainUser.Instance.login(emailInput.value, passwInput.value, totpInput.value);
		if (status == 200)
		{
			setCookie("jwt_session", data.token, 10);
			await MainUser.Instance.loginSession();
			Router.Instance?.navigateTo("/lobby");
			return ;
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
			setCookie("jwt_session", data.token, 10);
			await MainUser.Instance?.loginSession();
		}
	}

	private async submitNewUser()
	{
		if (!MainUser.Instance)
			return;

		var		email = (<HTMLInputElement>this.querySelector("#create_email")).value;
		var		passw = (<HTMLInputElement>this.querySelector("#create_passw")).value;
		var		confirmPassw = (<HTMLInputElement>this.querySelector("#confirm_passw")).value;
		var		username = (<HTMLInputElement>this.querySelector("#create_username")).value;

		if (email == "" || confirmPassw == "" || passw == "" || username == "")
		{
			setPlaceHolderText("some field are empty");
			return ;
		}
		if (confirmPassw != passw)
		{
			setPlaceHolderText("passwords don't match");
			return;
		}

		const response = await fetch("/api/user/create", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				email: email,
				passw: passw,
				username: username,
			})
		});
		const json = await response.json();
		if (response.status == 200)
		{
			const { status, data } = await MainUser.Instance.login(email, passw, "");
			if (status == 200)
			{
				setCookie("jwt_session", data.token, 10);
				MainUser.Instance.loginSession();
				return ;
			}
			setPlaceHolderText("user created");
		}
		else if (response.status == 403)
			setPlaceHolderText(json.message);
		else 
			setPlaceHolderText("database error");
	}
}

function oauthLogin(path: string)
{
	window.location.href = (`${window.location.origin}${path}`);
}

