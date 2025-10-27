import { hashString } from './sha256.js'
import { MainUser } from './User.js';

document.getElementById("create_btn")?.addEventListener("click", submitNewUser);
document.getElementById("login_btn")?.addEventListener('click', login);
document.getElementById("avatar_upload_btn")?.addEventListener("click", uploadAvatar);
document.getElementById("add_friend_btn")?.addEventListener("click", sendFriendInvite);
document.getElementById("refresh_btn")?.addEventListener("click", () => user.refreshSelf());

var user:MainUser = new MainUser(document.body, document.getElementById("friends_list"), document.getElementById("friends_pndg_list"));


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

	if (email == "" || passw == "" || username == "")
	{
		addLog(500, "some field are empty");
		return ;
	}

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

	const { status, data } = await user.login(emailInput.value, passwInput.value);
	if (status == -1)
	{
		setPlaceholderTxt("please logout first.");
		return ;
	}

	const jsonString: string = JSON.stringify(data);
	addLog(status, jsonString);
	if (status == 404)
		setPlaceholderTxt("passw or email invalid");
	else if (status == 500) 
		setPlaceholderTxt("database error");
	else if (status == 200)
		setPlaceholderTxt("connected !");
}

var intervalId: any;
try {
	 intervalId = setInterval(() => user.refreshSelf(), 10000);
} catch (error) {
	console.log(error);
	clearInterval(intervalId);
}
