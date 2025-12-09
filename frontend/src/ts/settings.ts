import { AuthSource, MainUser } from "User.js"
import { hashString } from "sha256.js";
import { setPlaceHolderText } from "utils.js";

var user: MainUser = new MainUser(document.getElementById("user-container"));
await user.loginSession();
user.onLogout((user) => { window.location.href = window.location.origin })
if (user.id == -1) // user not login
	window.location.href = window.location.origin;

document.getElementById("banner")?.addEventListener("click", () => window.location.href = window.location.origin);
document.getElementById("logout_btn")?.addEventListener("click", () => user.logout());
document.getElementById("profile_btn")?.addEventListener("click", () => window.location.href = window.location.origin + "/profile");
document.getElementById("settings_btn")?.addEventListener("click", () => window.location.href = window.location.origin + "/settings");
document.getElementById("user-menu-btn").addEventListener('click', () => {
	document.getElementById("user-menu-container").classList.toggle("hide");
});

const usernameInput = document.getElementById("username-input") as HTMLInputElement;
const emailInput = document.getElementById("email-input") as HTMLInputElement;
const currPassInput = document.getElementById("curr-passw-input") as HTMLInputElement;
const newPassInput = document.getElementById("new-passw-input") as HTMLInputElement;
const avatarInput = document.getElementById("avatar-input") as HTMLInputElement;
const request2faBtn = document.getElementById("request-2fa-btn") as HTMLButtonElement;
const confirm2faInput = document.getElementById("confirm-2fa-input") as HTMLInputElement;
const logoutBtn = document.getElementById("settings-logout-btn") as HTMLButtonElement;
const delete2faBtn = document.getElementById("delete-2fa-btn") as HTMLButtonElement;
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;
const deleteBtn = document.getElementById("delete-btn") as HTMLButtonElement; // TODO: add an input as confirmation to delete user (e.g type delete-me in input);
const holder = document.getElementById('qrcode_holder') as HTMLElement;
const holderParent = holder.parentNode as HTMLElement;
const holderClose = document.getElementById("holder-close-btn") as HTMLElement;

const saveBtn = document.getElementById("save-btn");

usernameInput.placeholder = user.name;
emailInput.placeholder = user.getEmail();

request2faBtn.addEventListener("click", () => { new_totp(); setPlaceHolderText("scan qrcode with auth app and confirm code") });
delete2faBtn.addEventListener("click", () => { user.delTotp(); setPlaceHolderText("2fa has been removed") });
logoutBtn.addEventListener("click", () => user.logout());
saveBtn.addEventListener("click", () => confirmChange());
holderClose.addEventListener("click", () => holderParent.classList.add("hide"));
deleteBtn.addEventListener("click", () => showConfirmPanel(() => user.deleteUser()));
resetBtn.addEventListener("click", () => showConfirmPanel(() => {
	if (user.resetUser())
		setPlaceHolderText("all data has been reset");
	else
		setPlaceHolderText("error");
	document.getElementById("panel-holder").innerHTML = "";
}));


hideForbiddenElement();

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

function hideForbiddenElement()
{
	if (user.source !== AuthSource.INTERNAL)
	{
		document.getElementById("email-settings").style.display = "none";
		document.getElementById("passw-settings").style.display = "none";
		document.getElementById("2fa-settings").style.display = "none";
		delete2faBtn.style.display = "none";
		return ;
	}
}

async function confirmChange()
{
	var error: boolean = false;

	if (confirm2faInput.value !== "")
		validate_totp();

	if (avatarInput.files && avatarInput.files[0])
	{
		console.log("updating avatar");
		const file = avatarInput.files[0];
		const formData = new FormData();
		formData.append('avatar', file);
		user.setAvatar(formData);
	}

	if (newPassInput.value !== "" && currPassInput.value !== "")
	{
		console.log("updating password");
		const res = await fetch("/api/user/update/passw", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				oldPass: await hashString(currPassInput.value),
				newPass: await hashString(newPassInput.value)
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

	if (usernameInput.value !== "")
	{
		console.log("updating name");
		const res = await fetch("/api/user/update/name", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				name: usernameInput.value
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

	if (emailInput.value !== "")
	{
		console.log("updating email");
		const res = await fetch("/api/user/update/email", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				email: emailInput.value
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

	await user.refreshSelf();
}

async function new_totp()
{
	const { status, data } = await user.newTotp();
	holderParent.classList.remove("hide");
	var qrcode = data.qrcode;
	if (!qrcode)
		return ;

	const img = document.createElement('img');
	img.id = "qrcode_img"
	img.src = qrcode;
	img.alt = "TOTP qrcode";
	holder.innerHTML = "";
	holder.appendChild(img);
	console.log(status, JSON.stringify(data));
}

async function del_totp()
{
	const status = await user.delTotp();

	switch(status)
	{
		case 200:
			console.log("Totp removed");
			break;
		case 500:
			console.log("Database error");
			break;
		case 404:
			console.log("you need to login first");
			break;
		default:
			console.log("Unknow error");
			break;
	}
}

async function validate_totp()
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
