import { MainUser } from './User.js';

document.getElementById("play_btn").addEventListener('click', () => {
	if (user.getId() == -1)
		window.location.href = (`${window.location.origin}/login`);
	else
		window.location.href = (`${window.location.origin}/lobby`);
});

var user: MainUser = new MainUser(document.body, null, null);
await user.loginSession();

