import { hashString } from './sha256.js'
import { MainUser } from './User.js';

document.getElementById("create_btn")?.addEventListener("click", submitNewUser);
document.getElementById("login_btn")?.addEventListener('click', login);
document.getElementById("avatar_upload_btn")?.addEventListener("click", uploadAvatar);
document.getElementById("add_friend_btn")?.addEventListener("click", sendFriendInvite);

var user:MainUser = new MainUser(document.body, document.getElementById("user-list"));


async function sendFriendInvite()
{
	var inviteInput = document.getElementById("add_friend_input") as HTMLInputElement;
	user.addFriend(inviteInput.value);
	// getFriends();
}

async function uploadAvatar()
{
	var fileInput = document.getElementById("avatar_input") as HTMLInputElement;
	if (!fileInput)
	{
		console.error("no avatar_upload elt found");
		return ;
	}

	const retval: number = await user.setAvatar(fileInput.files[0]);
	if (retval == 1)
	{
		setPlaceholderTxt("you need to login first");
		return ;
	}
}


function setPlaceholderTxt(msg:string)
{
	var txt = document.getElementById("placeholder");
	if (!txt)
	{
		console.error("no placeholder text found");
		return ;
	}

	txt.innerText = msg;
}

function addLog(code:number, msg:string)
{
	const parent = document.getElementById("debug-box");

	if (!parent)
		return;

	const child = document.createElement("p");
	child.textContent = `<${code}>: ${msg}`;
	child.className = "debug-text";
	
	parent.prepend(child);
}

async function submitNewUser()
{
	var		email = (<HTMLInputElement>document.getElementById("create_email")).value;
	var		passw = (<HTMLInputElement>document.getElementById("create_passw")).value;
	var		username = (<HTMLInputElement>document.getElementById("create_username")).value;

	const response = await fetch("/api/create_user", {
		method: "POST",
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			email: email,
			passw: hashString(passw),
			username: username,
		})
	});
	const data = await response.json();

	const jsonString: string = JSON.stringify(data);
	if (response.status == 200)
		setPlaceholderTxt("user created");
	else if (response.status == 403)
		setPlaceholderTxt("email invalid");
	else 
		setPlaceholderTxt("database error");

	addLog(response.status, jsonString);
}

async function login()
{
	var	emailInput = document.getElementById("login_email") as HTMLInputElement;
	var	passwInput = document.getElementById("login_passw") as HTMLInputElement;

	const { status, data } = await user.login(emailInput.value, passwInput.value);
	if (status == -1)
	{
		setPlaceholderTxt("please logout first.");
		return ;
	}

	const jsonString: string = JSON.stringify(data);
	if (status == 404)
		setPlaceholderTxt("passw or email invalid");
	else if (status == 500) 
		setPlaceholderTxt("database error");
	else if (status == 200)
		setPlaceholderTxt("connected !");
	addLog(status, jsonString);
}

