import { Router } from "app.js";

export function getUrlVar(): Map<string, string>
{
	const	url = window.location.href;
	if (url.indexOf('?') == -1)
		return new Map<string, string>();

	var		vars: Map<string, string> = new Map<string, string>();
	var		hashes = url.split("?")[1];
	var		hash = hashes.split("&");

	for (let i = 0; i < hash.length; i++)
	{
		var param = hash[i].split('=');
		vars.set(param[0], param[1]);
	}
	return vars;
}

export function setCookie(name: string, value: any, exdays: any)
{
	const d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	let expire = "expire=" + d.toUTCString();
	document.cookie = name + "=" + value + ";" + expire + ";path=/";
}

export function setPlaceHolderText(msg: string)
{
	var placeholder: HTMLElement;

	if (Router.Instance === null)
		placeholder = document.getElementById("placeholder-text") as HTMLElement;
	else
		placeholder = Router.getElementById("placeholder-text") as HTMLElement;
	placeholder.classList.remove("hide");
	placeholder.innerText = msg;
}
