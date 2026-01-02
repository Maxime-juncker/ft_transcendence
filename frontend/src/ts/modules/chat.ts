import { strToCol, hashString } from 'sha256.js';
import { User, UserStatus, MainUser, getUserFromId } from 'User.js'
import { Router } from 'app.js';
import * as usr from './chat_user.js';
import * as utils from './chat_utils.js'

export class Message
{
	private m_sender:	User;
	private m_msg:		string;
	private m_isCmd:	boolean;

	constructor(sender: User, msg: string)
	{
		this.m_sender = sender;
		this.m_msg = msg;

		this.m_isCmd = msg.charAt(0) === '/' ? true : false; // TODO: handle cmd
	}

	public getSender() : User	{ return this.m_sender; }
	public getMsg() : string	{ return this.m_msg; }
	public isCmd() : boolean	{ return this.m_isCmd; }

	public async sendToAll(chat: Chat)
	{
		if (this.m_isCmd && await this.execLocalCommand(chat) === true) return;

		const packet = { username: this.m_sender.name, message: this.m_msg, isCmd: this.m_isCmd };
		chat.ws?.send(JSON.stringify(packet));
	}

	/**
	* convert the msg to html
	* @returns an html version of a message or null if no template is found
	*/
	public toHtml() : HTMLElement | null
	{
		const template = Router.getElementById("chat-item-template") as HTMLTemplateElement;
		if (!template)
		{
			console.error("no template found for user element");
			return null;
		}

		const clone = template.content.cloneNode(true) as HTMLElement;
		const senderTxt = clone.querySelector("#sender") as HTMLElement;
		if (!senderTxt)
			console.warn("no senderTxt found");

		senderTxt.textContent = utils.applyMsgStyle(this.m_sender.name);
		senderTxt.style.color = strToCol(this.m_sender.name);

		const msgTxt = clone.querySelector("#message") as HTMLElement;
		if (!msgTxt)
			console.warn("no senderTxt found");
		msgTxt.textContent = this.getMsg();

		return clone;
	}

	public async execLocalCommand(chat: Chat) : Promise<boolean | null>
	{
		if (!this.m_isCmd) return false;

		const args: string[] = this.m_msg.split(/\s+/);
		var code: number;
		if (!chat.user)
			return null;

		switch (args[0])
		{
			case "/block":
				chat.displayMessage(await usr.block(chat.user.id, args[1]));
				return true;
			case "/unblock":
				chat.displayMessage(await usr.unblock(chat.user.id, args[1]));
				return true;
			case "/getblock":
				chat.displayMessage(await usr.getBlocked(chat.user.id));
				return true;
			case "/clear":
				if (chat.chatbox)
					chat.chatbox.innerHTML = "";
				return true;
			case "/help":
				chat.displayMessage(utils.serverReply(utils.helpMsg))
				return true;
			case "/addFriend":
				if (args.length != 2) return null;
				code = await chat.user?.addFriend(args[1]);
				if (code == 404) chat.displayMessage(utils.serverReply("user not found"))
				if (code == 200) chat.displayMessage(utils.serverReply("request sent"))
				return true;
			case "/hist":
				if (args.length != 2) return null;
				var response = await fetch(`/api/user/get_history_name/${args[1]}`, { method : "GET" })
				var data = await response.json();
				code = response.status;
				if (code == 404) chat.displayMessage(utils.serverReply("no history"));
				if (code == 200) chat.displayMessage(utils.serverReply(JSON.stringify(data, null, 2)));
				return true;
			case "/getfriends":
				var res = await fetch(`/api/friends/get?user_id=${chat.user.id}`);
				var data = await res.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)));
				return true;
			case "/dm":
				const match = this.m_msg.match(/^\/dm\s+\S+\s+(.+)$/);
				var response = await fetch(`/api/chat/dm`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						login: chat.user.name,
						username: args[1],
						msg: match ? match[1] : "is whispering to you!!",
					})
				});
				var data = await response.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)))
				return true;
			case "/addGame":
				if (args.length != 5) return null;
				var response = await fetch(`/api/user/add_game_history`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						user1_name: args[1],
						user2_name: args[2],
						user1_score: args[3],
						user2_score: args[4]
					})
				});
				var data = await response.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)))
				return true;
			case "/deleteMe":
				if (chat.user.id == -1) return true; // not login
				var response = await fetch ('api/user/delete', {
					method: "DELETE",
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ user_id: chat.user.id })
				});
				var data = await response.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)))
				chat.user.logout();
				return true;
			case "/UpdateMe":
				if (chat.user.id == -1) return true; // not login
				var response = await fetch(`/api/user/update`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						oldName: chat.user.name,
						oldPassw: await hashString(args[2]),
						name: args[3],
						email: args[4],
						passw: await hashString(args[5])
					})
				});
				var data = await response.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)))
				if (chat.user.name == args[1])
					chat.user.logout();
				return true;
		}
		return false; // command is not local
	}
};

export class Chat
{
	private m_chatbox:		HTMLElement | null = null;
	private m_chatInput:	HTMLInputElement | null = null;
	private m_user:			MainUser | null = null;
	private	m_ws:			WebSocket | null = null;
	private m_connections:	User[] = [];

	private m_onStartGame:		Array<(json: any) => void>;
	private m_onConnRefresh:	Array<(conns: User[]) => void>;

	constructor(user: MainUser, chatbox: HTMLElement, chatInput: HTMLInputElement)
	{
		this.m_onStartGame = [];
		this.m_onConnRefresh = [];

		if (!chatbox || !chatInput || !user)
		{
			console.error("chatbox, user or chatInput invalid");
			return ;
		}
		this.m_chatbox = chatbox;
		this.m_chatInput = chatInput;
		this.m_user = user;

		user.onLogin((user: MainUser) => this.resetChat(user));
		user.onLogout((user: MainUser) => this.resetChat(user));

		// TODO: merge with resetChat
		this.m_ws = new WebSocket(`wss://${window.location.host}/api/chat?userid=${user.id}`);

		this.m_ws.onmessage = (event:any) => this.receiveMessage(event);
		Router.addEventListener(chatInput, "keypress", (e) => this.sendMsgFromInput(e));
	}

	public onGameCreated(cb: ((json: any) => void)) { this.m_onStartGame.push(cb); }
	public onConnRefresh(cb: ((conns: User[]) => void)) { this.m_onConnRefresh.push(cb); }

	get chatbox(): HTMLElement | null 	{ return this.m_chatbox; }
	get user(): MainUser | null			{ return this.m_user; }
	get ws(): WebSocket | null			{ return this.m_ws; }
	get conns(): User[] | null			{ return this.m_connections; }

	public resetChat(user: MainUser) : void
	{
		this.m_ws?.close();
		if (this.m_user)
		{
			this.m_ws = new WebSocket(`wss://${window.location.host}/api/chat?userid=${this.m_user.id}`);
			this.m_ws.onmessage = (event:any) => this.receiveMessage(event);
		}
	}

	public disconnect()
	{
		this.m_user?.removeFromQueue();
		this.m_ws?.close();
		if (this.m_chatbox)
			this.m_chatbox.innerHTML = "";
	}

	private sendMsgFromInput(event: any)
	{
		if (!this.m_user)
			return ;

		if (event.key == 'Enter' && this.m_chatInput && this.m_chatInput.value != "")
		{
			this.sendMsg(this.m_user, this.m_chatInput.value);
			this.m_chatInput.value = "";
		}
	}

	private async populateConnections(connectionsId: number[])
	{
		this.m_connections = [];
		if (!this.m_user)
			return ;

		for (let i = 0; i < connectionsId.length; i++)
		{
			const id = connectionsId[i];
			if (id == this.m_user.id || id == -1)
				continue;

			const tmp: User | null = await getUserFromId(id);
			if (!tmp)
			{
				console.warn("failed to get user");
				return ;
			}
			this.m_connections.push(tmp);
		}
		this.m_onConnRefresh.forEach(cb => { cb(this.m_connections) });
	}

	private receiveMessage(event: any)
	{
		const json = JSON.parse(event.data);
		const username = json.username;
		const message = json.message;

		if ("connections" in json)
		{
			const connectionsId = json.connections;
			this.populateConnections(connectionsId);
		}

		if (message == "START")
		{
			console.log(json);
			this.m_onStartGame.forEach(cb => cb(json));
		}
		const user = new User();
		user.setUser(-1, username, "", "", UserStatus.UNKNOW); // TODO: ajouter un user.ToJSON() et envoyer toutes les infos au serv
		const newMsg = new Message(user, message);
		this.displayMessage(newMsg);
	}

	public displayMessage(newMsg: Message)
	{
		const html = newMsg.toHtml();
		if (this.m_chatbox && html)
			this.m_chatbox.prepend(html);
	}

	public async sendMsg(sender: User, msg: string)
	{
		var newMsg = new Message(sender, msg);

		const html = newMsg.toHtml();
		if (this.m_chatbox && html)
			this.m_chatbox.prepend(html);
		await newMsg.sendToAll(this);
	}
}

