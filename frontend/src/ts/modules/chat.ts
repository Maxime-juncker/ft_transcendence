import { strToCol, hashString } from 'sha256.js';
import { User, UserStatus, MainUser } from 'User.js'
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
		chat.getWs().send(JSON.stringify(packet));
	}

	public toHtml(className: string) : HTMLElement
	{
		const container = document.createElement("div");
		container.className = className;

		const senderTxt = document.createElement("h1");
		senderTxt.innerText = utils.applyMsgStyle(this.m_sender.name);
		senderTxt.style.color = strToCol(this.m_sender.name);

		const msg = document.createElement("p");
		msg.innerText = this.getMsg();

		container.prepend(msg);
		container.prepend(senderTxt);
		
		return container;
	}

	public async execLocalCommand(chat: Chat) : Promise<boolean>
	{
		if (!this.m_isCmd) return false;

		const args: string[] = this.m_msg.split(/\s+/);
		var code: number;
		switch (args[0])
		{
			case "/block":
				chat.displayMessage(await usr.block(chat.getUser().getId(), args[1]));
				return true;
			case "/unblock":
				chat.displayMessage(await usr.unblock(chat.getUser().getId(), args[1]));
				return true;
			case "/getblock":
				chat.displayMessage(await usr.getBlocked(chat.getUser().getId()));
				return true;
			case "/clear":
				chat.getChatbox().innerHTML = "";
				return true;
			case "/help":
				chat.displayMessage(utils.serverReply(utils.helpMsg()))
				return true;
			case "/addFriend":
				if (args.length != 2) return ;
				code = await chat.getUser()?.addFriend(args[1]);
				if (code == 404) chat.displayMessage(utils.serverReply("user not found"))
				if (code == 200) chat.displayMessage(utils.serverReply("request sent"))
				return true;
			case "/getHist":
				if (args.length != 2) return ;
				var response = await fetch(`/api/user/get_history_name/${args[1]}`, { method : "GET" })
				var data = await response.json();
				code = response.status;
				if (code == 404) chat.displayMessage(utils.serverReply("no history"));
				if (code == 200) chat.displayMessage(utils.serverReply(JSON.stringify(data)));
				return true;
			case "/getfriends":
				var res = await fetch(`/api/friends/get?user_id=${chat.getUser().getId()}`);
				var data = await res.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)));
				return true;
			case "/dm":
				var response = await fetch(`/api/chat/dm`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						login: chat.getUser().name,
						username: args[1],
						msg: this.m_msg,
					})
				});
				var data = await response.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)))
				return true;
			case "/addGame":
				if (args.length != 5) return ;
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
			case "/UpdateMe":
				if (chat.getUser().getId() == -1) return true; // not login
				var response = await fetch(`/api/user/update`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						oldName: chat.getUser().name,
						oldPassw: await hashString(args[2]),
						name: args[3],
						email: args[4],
						passw: await hashString(args[5])
					})
				});
				var data = await response.json();
				chat.displayMessage(utils.serverReply(JSON.stringify(data)))
				if (chat.getUser().name == args[1])
					chat.getUser().logout();
				return true;
		}
		return false; // command is not local
	}
};

export class Chat
{
	private m_chatlog:		Message[];

	private m_chatbox:		HTMLElement;
	private m_chatInput:	HTMLInputElement;
	private m_user:			MainUser;
	private	m_ws:			WebSocket;

	constructor(user: MainUser, chatbox: HTMLElement, chatInput: HTMLInputElement)
	{
		if (!chatbox || !chatInput || !user)
		{
			console.error("chatbox, user or chatInput invalid");
			return ;
		}
		this.m_chatbox = chatbox;
		this.m_chatInput = chatInput;
		this.m_user = user;
		this.m_chatlog = [];
		user.onLogin((user: MainUser) => this.resetChat(user));
		user.onLogout((user: MainUser) => this.resetChat(user));

		// TODO: merge with resetChat
		console.log(`connecting to chat websocket: ${window.location.host}`)
		this.m_ws = new WebSocket(`wss://${window.location.host}/api/chat?userid=${user.getId()}`);

		this.m_ws.onmessage = (event:any) => this.receiveMessage(event);
		chatInput.addEventListener("keypress", (e) => this.sendMsgFromInput(e));
	}
	public getChatlog(): Message[]		{ return this.m_chatlog; }
	public getChatbox(): HTMLElement	{ return this.m_chatbox; }
	public getUser(): MainUser			{ return this.m_user; }
	public getWs(): WebSocket			{ return this.m_ws; }

	public resetChat(user: MainUser) : void
	{
		console.log(`connecting to chat websocket: ${window.location.host}`)
		this.m_ws.close();
		this.m_ws = new WebSocket(`wss://${window.location.host}/api/chat?userid=${this.m_user.getId()}`);

		this.m_ws.onmessage = (event:any) => this.receiveMessage(event);
	}

	private sendMsgFromInput(event: any)
	{
		if (event.key == 'Enter' && this.m_chatInput.value != "")
		{
			this.sendMsg(this.m_user, this.m_chatInput.value);
			this.m_chatInput.value = "";
		}
	}

	private receiveMessage(event: any)
	{
		const json = JSON.parse(event.data);
		const username = json.username;
		const message = json.message;

		const user = new User();
		user.setUser(-1, username, "", "", UserStatus.UNKNOW); // TODO: ajouter un user.ToJSON() et envoyer toutes les infos au serv
		const newMsg = new Message(user, message);
		this.displayMessage(newMsg);
	}

	public displayMessage(newMsg: Message)
	{
		this.m_chatbox.prepend(newMsg.toHtml("user-msg"));
		this.m_chatlog.push(newMsg);
	}

	public async sendMsg(sender: User, msg: string)
	{
		var newMsg = new Message(sender, msg);

		this.m_chatbox.prepend(newMsg.toHtml("user-msg"));
		await newMsg.sendToAll(this);
		this.m_chatlog.push(newMsg);
	}
}

