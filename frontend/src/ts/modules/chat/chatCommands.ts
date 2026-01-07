import { ChatCommand } from "./Command.js";
import { Chat } from "./chat.js";
import { serverReply } from "./chat_utils.js";

async function displayResponse(chat: Chat, response: Response)
{
	const json = await response.json();
	chat.displayMessage(serverReply(JSON.stringify(json, null, 2)));
}

export function registerCmds(chat: Chat)
{
	const cmd: ChatCommand = chat.chatCmd;

	cmd.register("help", "\n\tshow help page", (chat: Chat) => {
		chat.displayMessage(serverReply(chat.chatCmd.GetHelpTxt()));
	});

	cmd.register("clear", "\n\tclear the screen", (chat: Chat) => {
		if (chat.chatbox)
			chat.chatbox.innerHTML = "";
	});

	cmd.register("ping", "\n\ttest server connection", async (chat: Chat) => {
		const res = await fetch("/api/chat/ping");
		displayResponse(chat, res);
	});

	cmd.register("inspect", "<username>\n\tshow user info", async (chat: Chat, argv: Array<string>) => {
		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /inspect <username>"));
			return ;
		}
		const res = await fetch(`/api/user/get_profile_name?profile_name=${argv[1]}`)
		displayResponse(chat, res);
	});

	cmd.register("dm", "<username> [message]\n\tsend direct message to user", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return;
		var message = "is whispering to you.";
		if (argv.length == 1 || argv.length > 3)
		{
			chat.displayMessage(serverReply("usage: /dm <username> [message]"));
			return ;
		}
		if (argv.length == 3)
			message = argv[2];
		console.log(argv);
		const res = await fetch("/api/chat/dm", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				token: chat.user?.token,
				username: argv[1],
				msg: message
			})
		});
		displayResponse(chat, res);
	})

	cmd.register("getFriend", "\n\treturn friends", async (chat: Chat, argv: Array<string>) => {
		if (argv.length != 1)
		{
			chat.displayMessage(serverReply("usage: /getFriend"));
			return ;
		}
		if (!chat.user)
			return ;

		var res = await fetch(`/api/friends/get?user_id=${chat.user.id}`);
		displayResponse(chat, res);
	});

	cmd.register("sendFriendRequest", "<username>\n\tsend friend req to user", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;
		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /sendFriendRequest <username>"));
			return ;
		}
		var response = await fetch(`/api/user/get_profile_name?profile_name=${argv[1]}`);
		var json = await response.json();
		if (response.status != 200)
		{
			chat.displayMessage(serverReply(JSON.stringify(json, null, 2)));
			return;
		}
		const id = json.id;
		response = await fetch("/api/friends/send_request", {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: chat.user.token,
				friend_id: id
			})
		});
		displayResponse(chat, response);
	});

	cmd.register("removeFriend", "<username>\n\tdelete friend", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;
		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /acceptFriend <username>"));
			return ;
		}
		var response = await fetch(`/api/user/get_profile_name?profile_name=${argv[1]}`);
		var json = await response.json();
		if (response.status != 200)
		{
			chat.displayMessage(serverReply(JSON.stringify(json, null, 2)));
			return;
		}

		const id = json.id;
		response = await fetch("/api/friends/remove", {
			method: "DELETE",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: chat.user.token,
				friend_id: id
			})
		});
		displayResponse(chat, response);
	});

	cmd.register("acceptFriend", "<username>\n\taccept friend request", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;
		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /acceptFriend <username>"));
			return ;
		}
		var response = await fetch(`/api/user/get_profile_name?profile_name=${argv[1]}`);
		var json = await response.json();
		if (response.status != 200)
		{
			chat.displayMessage(serverReply(JSON.stringify(json, null, 2)));
			return;
		}

		const id = json.id;
		response = await fetch("/api/friends/accept", {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: chat.user.token,
				friend_id: id
			})
		});
		displayResponse(chat, response);
	});

	cmd.register("getBlock", "\n\tsee blocked users", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;
		if (argv.length != 1)
		{
			chat.displayMessage(serverReply("usage: /getBlock"));
			return ;
		}
		const response = await fetch('/api/user/blocked_users', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token: chat.user.token })
		});
		displayResponse(chat, response);
	});

	cmd.register("block", "<username>\n\tblock username", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;
		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /block <username>"));
			return ;
		}
		var response = await fetch(`/api/user/get_profile_name?profile_name=${argv[1]}`);
		var json = await response.json();
		if (response.status != 200)
		{
			chat.displayMessage(serverReply(JSON.stringify(json, null, 2)));
			return;
		}
		response = await fetch('/api/user/block', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ 
				token: chat.user.token,
				id: json.id
			})
		});

		displayResponse(chat, response);
	});

	cmd.register("unblock", "<username>\n\tunblock username", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;
		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /unblock <username>"));
			return ;
		}
		var response = await fetch(`/api/user/get_profile_name?profile_name=${argv[1]}`);
		var json = await response.json();
		if (response.status != 200)
		{
			chat.displayMessage(serverReply(JSON.stringify(json, null, 2)));
			return;
		}
		response = await fetch('/api/user/unblock', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ 
				token: chat.user.token,
				id: json.id
			})
		});

		displayResponse(chat, response);
	});
}
