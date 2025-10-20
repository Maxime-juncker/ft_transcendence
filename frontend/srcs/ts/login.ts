import { User } from './User.js';

var user:User = null;

document.getElementById("create_btn")?.addEventListener("click", submitNewUser);
document.getElementById("login_btn")?.addEventListener('click', login);
document.getElementById("logout_btn")?.addEventListener("click", logout);
document.getElementById("avatar_upload_btn")?.addEventListener("click", uploadAvatar);
document.getElementById("add_friend_btn")?.addEventListener("click", sendFriendInvite);

async function sendFriendInvite()
{
	var inviteInput = document.getElementById("add_friend_input") as HTMLInputElement;
	if (!inviteInput)
	{
		console.error("no add_friend_input found");
		return ;
	}

	
}

async function uploadAvatar()
{
	if (!user)
	{
		setPlaceholderTxt("you need to login first");
		return ;
	}

	var fileInput = document.getElementById("avatar_input") as HTMLInputElement;
	if (!fileInput)
	{
		console.error("no avatar_upload elt found");
		return ;
	}

	await user.setAvatar(fileInput.files[0]);
	updateUser(user, document.getElementById("user1"));
}

// Todo: change using sha256
function hashString(name: string)
{
	let hash = 0;

	for	(let i = 0; i < name.length; i++)
	{
		let c = name.charCodeAt(i);
		hash = ((hash << 5) - hash) + c;
		hash = hash & hash;
	}
	return hash;
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

function updateUser(user:User, elt:HTMLElement)
{
	var img = elt.children[0] as HTMLImageElement;
	var username = elt.children[1].children[0] as HTMLElement;
	var elo = elt.children[1].children[1] as HTMLElement;

	if (!img || !username || !elo)
	{
		console.error("can't find elt to update user");
		return;
	}

	if (user)
	{
		img.src = user.getAvatarPath();
		username.innerText = user.name;
		elo.innerText = "500";
	}
	else
	{
		img.src = "";
		username.innerText = "guest";
		elo.innerText = "0";
	}
}


// TODO: set user status based on login / logout
function setUser(data:any)
{
	if (!data) // logout
	{
		updateUser(null, document.getElementById("user1"));
		return ;
	}

	var parsed = JSON.parse(data);
	console.log(data);

	user = new User(parsed.id, parsed.name, parsed.email, parsed.profile_picture);
	updateUser(user, document.getElementById("user1"));

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
	if (response.status == 201)
		setPlaceholderTxt("user created");
	else if (response.status == 403)
		setPlaceholderTxt("email invalid");
	else 
		setPlaceholderTxt("database error");

	addLog(response.status, jsonString);
}

async function login()
{
	var		email = (<HTMLInputElement>document.getElementById("login_email")).value;
	var		passw = (<HTMLInputElement>document.getElementById("login_passw")).value;

	if (user)
	{
		setPlaceholderTxt("please logout first.");
		return ;
	}

	const response = await fetch("/api/login", {
		method: "POST",
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			email: email,
			passw: hashString(passw),
		})
	});
	const data = await response.json();

	const jsonString: string = JSON.stringify(data);
	if (response.status == 404)
		setPlaceholderTxt("passw or email invalid");
	else if (response.status == 500) 
		setPlaceholderTxt("database error");
	else if (response.status == 200)
	{
		setPlaceholderTxt("connected !");
		setUser(jsonString);
	}
	addLog(response.status, jsonString);

}

function logout()
{
	addLog(200, "user has logout");
	setUser(null);
	user = null;
}
