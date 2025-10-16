import { User } from './User.js';

var user:User = null;

const create_btn = document.getElementById("create_btn");
if (create_btn)
	create_btn.addEventListener('click', submit_new_user);
else
	console.error("no submit btn found !");


const login_btn = document.getElementById("login_btn");
if (login_btn)
	login_btn.addEventListener('click', login);
else
	console.error("no submit btn found !");


// Todo: change using sha256
function hash_string(name: string)
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

	console.log(img);
	console.log(username);
	console.log(elo);
	if (img)
		img.src = user.pp_path;
	if (username)
		username.innerText = user.name;
	if (elo)
		elo.innerText = "500";
}


function setUser(data)
{
	var parsed = JSON.parse(data);
	console.log(data);

	user = new User(parsed.name, parsed.email);
	user.pp_path = parsed.profile_picture;
	updateUser(user, document.getElementById("user1"));
	console.warn(user);
}

async function submit_new_user()
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
			passw: hash_string(passw),
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
			passw: hash_string(passw),
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
