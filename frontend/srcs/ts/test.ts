const btn = document.getElementById("submit_btn");
if (btn)
{
	btn.addEventListener('click', submit_new_user);
}
else
{
	console.error("no submit btn found !");
}

function submit_new_user()
{
	const	passw = document.getElementById("passw")?.nodeValue;
	const	username = document.getElementById("username")?.nodeValue;
	var		email = (<HTMLInputElement>document.getElementById("email")).value;

	console.log(email);
	console.log(passw);
	console.log(username);
}
