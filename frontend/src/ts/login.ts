import { hashString } from 'sha256.js'
import { MainUser } from './User.js';
import { setPlaceHolderText } from 'utils.js';

async function submitNewUser()
{
	var		email = (<HTMLInputElement>document.getElementById("create_email")).value;
	var		passw = (<HTMLInputElement>document.getElementById("create_passw")).value;
	var		username = (<HTMLInputElement>document.getElementById("create_username")).value;

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

async function login()
{
	var	emailInput = document.getElementById("login_email") as HTMLInputElement;
	var	passwInput = document.getElementById("login_passw") as HTMLInputElement;
	var totpInput = document.getElementById("login_totp") as HTMLInputElement;

	const { status, data } = await user.login(emailInput.value, passwInput.value, totpInput.value);
	if (status == -1)
	{
		setPlaceHolderText("please logout first.");
		return ;
	}

	if (status == 404)
		setPlaceHolderText("passw or email or totp invalid");
	else if (status == 500) 
		setPlaceHolderText("database error");
	else if (status == 200)
		setPlaceHolderText("connected !");
}

async function logAsGuest()
{
	const res = await fetch("/api/user/create_guest", {
		method: "POST",
	})

	if (res.status == 200)
	{
		user.loginSession();
	}
	
}

function oauthLogin(path: string)
{
	window.location.href = (`${window.location.origin}${path}`);
}

var user: MainUser = new MainUser(null);
await user.loginSession();
if (user.id != -1)
	window.location.href = window.location.origin + "/lobby";

user.onLogin((user) => { window.location.href = window.location.origin + "/lobby" })

document.getElementById("create_btn")?.addEventListener("click", submitNewUser);
document.getElementById("login_btn")?.addEventListener('click', login);
document.getElementById("forty_two_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/forty_two"));
document.getElementById("github_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/github"));
document.getElementById("guest_log_btn")?.addEventListener("click", logAsGuest);

document.getElementById("home_btn")?.addEventListener("click", () => { 
	window.location.href = (`${window.location.origin}`);
});


setInterval(() => user.refreshSelf(), 60000);


