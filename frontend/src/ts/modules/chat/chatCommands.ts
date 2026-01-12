import { ThemeController, Theme } from "modules/pages/Theme.js";
import { ChatCommand } from "./Command.js";
import { Chat } from "./chat.js";
import { serverReply } from "./chat_utils.js";
import { User, getUserFromId } from "modules/user/User.js";

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

	cmd.register("setTheme", "<theme name>\n\tset the global theme to <theme name>", async (chat: Chat, argv: Array<string>) => {
		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /setTheme <theme name>"));
			return ;
		}
		ThemeController.Instance?.setGlobalTheme(argv[1]);
		chat.displayMessage(serverReply(`theme set to ${argv[1]}`));
	});

	cmd.register("listTheme", "\n\tlist all available themes", async (chat: Chat, argv: Array<string>) => {
		const themes: Theme[] = ThemeController.Instance ? ThemeController.Instance.themes : [];
		var themeStr = "+++ themes +++";

		ThemeController.Instance?.setGlobalTheme(argv[1]);
		themes.forEach((theme: Theme) => {
			themeStr += `\n\t+${theme.name}`;
		});
		chat.displayMessage(serverReply(themeStr));
	});

	cmd.register("listInvite", "\n\tlist all pending invite", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;

		if (argv.length != 1)
		{
			chat.displayMessage(serverReply("usage: /listInvite"));
			return ;
		}
		const res = await fetch("/api/duel/list", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token: chat.user.token })
		});
		const json = await res.json();
		console.log(json);
		var str = "+++ listing invite +++";
		for (let i = 0; i < json.length; i ++) {
			const el: any = json[i ];

			console.log(json);
			const sender = await getUserFromId(el.senderId);
			const receiver = await getUserFromId(el.id);
			if (!sender || !receiver || !chat.user)
				return ;
			if (sender.id === chat.user.id)
				str += `\n-${receiver.name} (awaiting confirmation)`;
			else
				str += `\n+${sender.name} (use /accept or /decline)`;
			
		}
		chat.displayMessage(serverReply(str));
		// displayResponse(chat, res);
	});

	cmd.register("invite", "<username>\n\tsend invite to user for a duel", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;

		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /invite <username>"));
			return ;
		}
		const username = argv[1];
		var res = await fetch(`/api/user/get_profile_name?profile_name=${username}`);
		if (res.status != 200)
		{
			displayResponse(chat, res);
			return ;
		}
		const json = await res.json();
		res = await fetch("/api/duel/invite", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				token: chat.user.token,
				id: json.id
			})
		});
		chat.user.gameRouter?.navigateTo("game", "duel");
	});

	cmd.register("accept", "<username>\n\taccept invite of <username>", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;

		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /accept <username>"));
			return ;
		}
		const username = argv[1];
		var res = await fetch(`/api/user/get_profile_name?profile_name=${username}`);
		if (res.status != 200)
		{
			displayResponse(chat, res);
			return ;
		}
		var json = await res.json();
		chat.user.gameRouter?.navigateTo("game", "duel");

		res = await fetch("/api/duel/accept", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				token: chat.user.token,
				id: json.id
			})
		});
		
		displayResponse(chat, res);
	});

	cmd.register("decline", "<username>\n\tdecline invite of <username>", async (chat: Chat, argv: Array<string>) => {
		if (!chat.user)
			return ;

		if (argv.length != 2)
		{
			chat.displayMessage(serverReply("usage: /decline <username>"));
			return ;
		}
		const username = argv[1];
		var res = await fetch(`/api/user/get_profile_name?profile_name=${username}`);
		if (res.status != 200)
		{
			displayResponse(chat, res);
			return ;
		}
		const json = await res.json();
		res = await fetch("/api/duel/decline", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				token: chat.user.token,
				id: json.id
			})
		});
		displayResponse(chat, res);
	});

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
