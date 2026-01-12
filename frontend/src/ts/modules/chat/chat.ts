import { strToCol, hashString } from 'modules/utils/sha256.js';
import { ChatCommand } from './Command.js';
import { User, UserStatus, MainUser, getUserFromId } from 'modules/user/User.js'
import { Router } from 'modules/router/Router.js';
import { registerCmds } from './chatCommands.js';
import * as utils from './chat_utils.js'

export class Message
{
	private m_sender:	User;
	private m_msg:		string;

	constructor(sender: User, msg: string)
	{
		this.m_sender = sender;
		this.m_msg = msg;
	}

	public getSender() : User	{ return this.m_sender; }
	public getMsg() : string	{ return this.m_msg; }

	public async sendToAll(chat: Chat)
	{
		const packet = { username: this.m_sender.name, message: this.m_msg, isCmd: false };
		chat.ws?.send(JSON.stringify(packet));
	}

	/**
	* convert the msg to html
	* @returns an html version of a message or null if no template is found
	*/
	public toHtml() : HTMLElement | null
	{
		const template = document.getElementById("chat-item-template") as HTMLTemplateElement;
		if (!template)
			return null;

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
};

export class Chat
{
	private m_chatbox:		HTMLElement | null = null;
	private m_chatInput:	HTMLInputElement | null = null;
	private m_user:			MainUser | null = null;
	private	m_ws:			WebSocket | null = null;
	private m_connections:	User[] = [];
	private m_chatCmd:		ChatCommand = new ChatCommand(this);

	private m_onStartGame:		Array<(json: any) => void>;
	private m_onConnRefresh:	Array<(conns: User[]) => void>;

	get chatCmd():	ChatCommand { return this.m_chatCmd; }

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
		this.m_user.onStatusChanged((status: UserStatus) => this.onUserStatusChanged(status));

		user.onLogout((user: MainUser) => this.resetChat(user));

		this.m_ws = new WebSocket(`wss://${window.location.host}/api/chat?userid=${user.id}`);

		this.m_ws.onmessage = (event:any) => this.receiveMessage(event);
		chatInput.addEventListener("keypress", (e) => this.sendMsgFromInput(e));
		registerCmds(this);
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
			if (this.m_chatbox)
				this.m_chatbox.innerHTML = "";
			
			this.m_user.removeFromQueue();

			this.m_ws = new WebSocket(`wss://${window.location.host}/api/chat?userid=${this.m_user.id}`);
			this.m_ws.onmessage = (event:any) => this.receiveMessage(event);
		}
	}

	public onUserStatusChanged(status: UserStatus)
	{
		if (status == UserStatus.BUSY || status == UserStatus.UNAVAILABLE)
			this.displayMessage(utils.serverReply("no message will be display"));
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
			this.startGameCb(json);
		}
		const user = new User();
		user.setUser(-1, username, "", "", UserStatus.UNKNOW);
		const newMsg = new Message(user, message);

		if (this.user?.status != UserStatus.UNAVAILABLE && this.user?.status != UserStatus.BUSY)
			this.displayMessage(newMsg);
	}

	public displayMessage(newMsg: Message)
	{
		const html = newMsg.toHtml();
		if (this.m_chatbox && html)
		{

			this.m_chatbox.prepend(html);
		}
	}

	public async sendMsg(sender: User, msg: string)
	{
		var newMsg = new Message(sender, msg);

		const html = newMsg.toHtml();
		if (this.m_chatbox && html)
			this.m_chatbox.prepend(html);
		
		if (msg.charAt(0) == '/')
		{
			const retval = this.m_chatCmd.run(msg);
			if (retval == 1) // command not found
				this.displayMessage(utils.serverReply("Command not found"));
			return ;
		}

		await newMsg.sendToAll(this);
	}

	public startGameCb(json: any)
	{
		console.log(this.m_onStartGame);
		this.m_onStartGame.forEach(cb => cb(json));
	}
}

