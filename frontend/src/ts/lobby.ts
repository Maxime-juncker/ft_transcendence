import { MainUser } from "User.js";
import { Chat } from "modules/chat.js";

console.log(document.getElementById("user-container"));
var user: MainUser = new MainUser(document.getElementById("user-container"), null, null);
await user.loginSession();

if (user.getId() == -1) // user not login
	window.location.href = window.location.origin;

user.onLogout((user) => { window.location.href = window.location.origin })

const userMenuContainer = document.getElementById("user-menu-container");
document.getElementById("user-menu-btn").addEventListener('click', () => {
	userMenuContainer.classList.toggle("hide");
});
document.getElementById("logout_btn")?.addEventListener("click", () => user.logout());
document.getElementById("banner")?.addEventListener("click", () => window.location.href = window.location.origin);


async function sendFriendInvite()
{
	var inviteInput = document.getElementById("add_friend_input") as HTMLInputElement;
	var status = await user.addFriend(inviteInput.value);
	console.log(status);
	// if (status == 1)
	// 	addLog(500, "some field are empty");
	// else if (status == 2)
	// 	addLog(500, "please login to add friends")
	// else if (status == 200)
	// 	addLog(status, "friend request sent!");
	// else if (status == 404)
	// 	addLog(status, "user profile not found!");
	// else
	// 	addLog(status, "database error!");
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

	else if (retval == 2)
	{
		setPlaceholderTxt("no file selected");
		return ;
	}
}


function setPlaceholderTxt(msg: string)
{
	var txt = document.getElementById("placeholder");
	if (!txt)
	{
		console.error("no placeholder text found");
		return ;
	}

	txt.innerText = msg;
}

const chatInput: HTMLInputElement = document.getElementById("chat-in") as HTMLInputElement;
const chat = new Chat(user, document.getElementById("chat-out"), chatInput);

document.getElementById("avatar_upload_btn")?.addEventListener("click", uploadAvatar);
document.getElementById("add_friend_btn")?.addEventListener("click", sendFriendInvite);
document.getElementById("refresh_btn")?.addEventListener("click", () => user.refreshSelf());
document.getElementById("chat_send_btn")?.addEventListener("click", () => chat.sendMsg(user, chatInput.value));

setInterval(() => user.refreshSelf(), 60000);

