export function getUrlVar(url: string)
{
	var		vars: any = {};
	var		hashes = url.split("?")[1];
	var		hash = hashes.split("&");

	for (let i = 0; i < hash.length; i++)
	{
		var param = hash[i].split('=');
		vars[param[0]] = param[1];
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

export function getSqlDate()
{
	return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"})).toISOString().slice(0, 19).replace('T', ' ');
}
