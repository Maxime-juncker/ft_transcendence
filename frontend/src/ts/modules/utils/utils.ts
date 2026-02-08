import { Router } from "modules/router/Router.js";

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

export function getCookie(name: string) 
{
	const regex = new RegExp(`(^| )${name}=([^;]+)`)
	const match = document.cookie.match(regex)
	if (match)
	{
		return match[2];
	}
}

export function setPlaceHolderText(msg: string)
{
	var placeholder: HTMLElement;

	if (Router.Instance === null)
		placeholder = document.getElementById("placeholder-text") as HTMLElement;
	else
		placeholder = Router.getElementById("placeholder-text") as HTMLElement;
	if (!placeholder)
		return;
	placeholder.classList.remove("hide");
	placeholder.innerText = msg;
}

export function levenshteinDistance(s1: string, s2: string): number
{
	if (s1.length == 0)
		return s2.length;
	if (s2.length == 0)
		return s1.length;

	const arr: any = [];
	for (let i = 0; i <= s2.length; i++)
	{
		arr[i] = [i];
		for (let j = 1; j <= s1.length; j++)
		{
			if (i === 0)
			{
				arr[i][j] = j;
				continue;
			}
			arr[i][j] = Math.min(
				arr[i - 1][j] + 1,										// addition
				arr[i][j - 1] + 1,										// deletion
				arr[i - 1][j - 1] + (s1[j - 1] === s2[i - 1] ? 0 : 1)	// subtitution
			);
		}
	}
	return arr[s2.length][s1.length];
}

export function toggleCrtEffect(state: boolean)
{
	if (state === true)
	{
		document.querySelector("#crt")?.classList.add("crt");
		document.querySelector(".crt-mask")?.classList.remove("hide");
		document.querySelector(".bootup-lines")?.classList.remove("hide");
		document.querySelector(".bootup-mask")?.classList.remove("hide");
		document.querySelector(".bootup-text")?.classList.remove("hide");
		document.querySelector(".bootup-text")?.classList.remove("hide");
		document.querySelector(".scanline")?.classList.remove("hide");
	}
	else
	{
		document.querySelector("#crt")?.classList.remove("crt");
		document.querySelector(".crt-mask")?.classList.add("hide");
		document.querySelector(".bootup-lines")?.classList.add("hide");
		document.querySelector(".bootup-mask")?.classList.add("hide");
		document.querySelector(".bootup-text")?.classList.add("hide");
		document.querySelector(".bootup-text")?.classList.add("hide");
		document.querySelector(".scanline")?.classList.add("hide");
	}

	setCookie("crt_state", state, 9999);
}
