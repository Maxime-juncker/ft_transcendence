import { MainUser } from "User.js";

var user: MainUser = new MainUser(document.body, null, null);
await user.loginSession();

if (user.getId() == -1) // user not login
	window.location.href = window.location.origin;

user.onLogout((user) => { window.location.href = window.location.origin })
