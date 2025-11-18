import { hashString } from 'sha256.js'
import { Chat } from '@modules/chat.js'
import { MainUser } from './User.js';

async function sendFriendInvite()
{
	var inviteInput = document.getElementById("add_friend_input") as HTMLInputElement;
	var status = await user.addFriend(inviteInput.value);
	if (status == 1)
		addLog(500, "some field are empty");
	else if (status == 2)
		addLog(500, "please login to add friends")
	else if (status == 200)
		addLog(status, "friend request sent!");
	else if (status == 404)
		addLog(status, "user profile not found!");
	else
		addLog(status, "database error!");
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

	else if (retval == 2)
	{
		setPlaceholderTxt("no file selected");
		return ;
	}
}


function setPlaceholderTxt(msg: string)
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

	if (email == "" || passw == "" || username == "")
	{
		addLog(500, "some field are empty");
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
	const data = await response.json();

	const jsonString: string = JSON.stringify(data);
	addLog(response.status, jsonString);
	if (response.status == 200)
		setPlaceholderTxt("user created");
	else if (response.status == 403)
		setPlaceholderTxt("email invalid");
	else 
		setPlaceholderTxt("database error");
}

async function login()
{
	var	emailInput = document.getElementById("login_email") as HTMLInputElement;
	var	passwInput = document.getElementById("login_passw") as HTMLInputElement;
	var totpInput = document.getElementById("login_totp") as HTMLInputElement;

	const { status, data } = await user.login(emailInput.value, passwInput.value, totpInput.value);
	if (status == -1)
	{
		setPlaceholderTxt("please logout first.");
		return ;
	}

	const jsonString: string = JSON.stringify(data);
	addLog(status, jsonString);
	if (status == 404)
		setPlaceholderTxt("passw or email or totp invalid");
	else if (status == 500) 
		setPlaceholderTxt("database error");
	else if (status == 200)
		setPlaceholderTxt("connected !");
}

async function new_totp()
{
	const { status, data } = await user.newTotp();
	var qrcode = data.qrcode;
	if (!qrcode)
	{
		setPlaceholderTxt("you need to login first");
		return ;
	}
	else
	{
		const img = document.createElement('img');
		img.id = "qrcode_img"
		img.src = qrcode;
		img.alt = "TOTP qrcode";
		document.getElementById('qrcode_holder').appendChild(img);
	}
	addLog(status, JSON.stringify(data));
}

async function del_totp()
{
	const status = await user.delTotp();

	switch(status)
	{
		case 200:
			setPlaceholderTxt("Totp removed");
			break;
		case 500:
			setPlaceholderTxt("Database error");
			break;
		case 404:
			setPlaceholderTxt("you need to login first");
			break;
		default:
			setPlaceholderTxt("Unknow error");
			break;
	}
}

async function validate_totp()
{
	var totp = document.getElementById("totp_check") as HTMLInputElement;

	const status = await user.validateTotp(totp.value);

	switch(status)
	{
		case 200:
			setPlaceholderTxt("Totp validated");
			const img = document.getElementById("qrcode_img");
			if (img)
				img.remove();
			break;
		case 500:
			setPlaceholderTxt("Database error");
			break;
		case 404:
			setPlaceholderTxt("you need to login first");
			break;
		default:
			setPlaceholderTxt("Unknow error");
			break;
	}
}


var user: MainUser = new MainUser(document.body, document.getElementById("friends_list"), document.getElementById("friends_pndg_list"));
await user.loginSession();
if (user.getId() != -1)
	window.location.href = window.location.origin + "/lobby";

user.onLogin((user) => { window.location.href = window.location.origin + "/lobby" })

const chatInput: HTMLInputElement = document.getElementById("chat_input") as HTMLInputElement;
const chat = new Chat(user, document.getElementById("chatbox"), chatInput);

document.getElementById("create_btn")?.addEventListener("click", submitNewUser);
document.getElementById("login_btn")?.addEventListener('click', login);
document.getElementById("avatar_upload_btn")?.addEventListener("click", uploadAvatar);
document.getElementById("add_friend_btn")?.addEventListener("click", sendFriendInvite);
document.getElementById("refresh_btn")?.addEventListener("click", () => user.refreshSelf());
document.getElementById("chat_send_btn")?.addEventListener("click", () => chat.sendMsg(user, chatInput.value));
document.getElementById("forty_two_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/forty_two"));
document.getElementById("github_log_btn")?.addEventListener("click", () => oauthLogin("/api/oauth2/github"));
document.getElementById("new_totp")?.addEventListener("click", new_totp);
document.getElementById("del_totp")?.addEventListener("click", del_totp);
document.getElementById("totp_check_send")?.addEventListener("click", validate_totp);

setInterval(() => user.refreshSelf(), 60000);

function oauthLogin(path: string)
{
	window.location.href = (`${window.location.origin}${path}`);
}

