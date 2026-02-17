import { ChatCommand } from './Command.js';
import { User, UserStatus, MainUser, getUserFromId } from 'modules/user/User.js'
import { registerCmds } from './chatCommands.js';
import * as utils from './chat_utils.js'
import { ThemeController } from 'modules/pages/Theme.js';

export class Message
{
	private m_sender:	User;
	private m_msg:		string;
	private m_json:		any | null;

	constructor(sender: User, msg: string, json: any | null)
	{
		this.m_sender = sender;
		this.m_msg = msg;
		this.m_json = json;
	}

	public getSender() : User	{ return this.m_sender; }
	public getMsg() : string	{ return this.m_msg; }

	public async sendToAll(chat: Chat)
	{
		const packet = { username: this.m_sender.name, message: this.m_msg, isCmd: false };
		chat.ws?.send(JSON.stringify(packet));
	}

	/**
	 * return a random color of the theme based on the value of all char in str
	 * @param str seed string
	 */
	private randomColor(str: string): string
	{
		const theme = ThemeController.Instance?.currentTheme;
		if (!theme)
			return "#ffffff";
		
		const colors = [theme.red, theme.blue, theme.green, theme.white, theme.purple, theme.yellow];

		var total = 0;
		for (let i = 0; i < str.length; i++)
		{
			total += str.charCodeAt(i);
		}

		return colors[total % colors.length];
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
		senderTxt.style.color = this.randomColor(this.m_sender.name);

		const msgTxt = clone.querySelector("#message") as HTMLElement;
		if (!msgTxt)
			console.warn("no senderTxt found");
		msgTxt.textContent = this.getMsg();

		if (this.m_json && this.m_json.data_i18n)
			msgTxt.setAttribute('data-i18n', this.m_json.data_i18n);

		return clone;
	}
};

export class Chat
{
	private m_chatbox:		HTMLElement | null = null;
	private m_chatInput:	HTMLInputElement | null = null;
	private	m_ws:			WebSocket | null = null;
	private m_connections:	User[] = [];
	private m_chatCmd:		ChatCommand = new ChatCommand(this);
	private m_isConnected:	boolean = false;

	private m_onStartGame:		Array<(json: any) => void>;
	private m_onConnRefresh:	Array<(conns: User[]) => void>;

	get chatCmd():	ChatCommand { return this.m_chatCmd; }

	constructor()
	{
		this.m_onStartGame = [];
		this.m_onConnRefresh = [];
	}

	public Init(chatbox: HTMLElement, chatInput: HTMLInputElement)
	{
		if (!MainUser.Instance)
			return;

		this.m_chatbox = chatbox;
		this.m_chatInput = chatInput;
		MainUser.Instance.onStatusChanged((status: UserStatus) => this.onUserStatusChanged(status));

		MainUser.Instance.onLogout(() => this.disconnect());
		MainUser.Instance.onLogin(() => this.resetChat());

		this.m_chatInput.addEventListener("keypress", (e) => this.sendMsgFromInput(e));
		registerCmds(this);
	}

	public connect()
	{
		if (!this.m_chatInput || !MainUser.Instance || MainUser.Instance.id == -1)
			return;

		this.m_ws = new WebSocket(`wss://${window.location.host}/api/chat?userid=${MainUser.Instance.token}`);
		this.m_ws.onmessage = (event:any) => this.receiveMessage(event);
		this.m_isConnected = true;
	}

	public onGameCreated(cb: ((json: any) => void)) { this.m_onStartGame.push(cb); }
	public onConnRefresh(cb: ((conns: User[]) => void)) { this.m_onConnRefresh.push(cb); }

	get chatbox(): HTMLElement | null 	{ return this.m_chatbox; }
	get user(): MainUser | null			{ return MainUser.Instance; }
	get ws(): WebSocket | null			{ return this.m_ws; }
	get conns(): User[] | null			{ return this.m_connections; }
	get isConnected(): boolean			{ return this.m_isConnected; }

	public resetChat() : void
	{
		this.m_ws?.close();
		if (MainUser.Instance)
		{
			if (this.m_chatbox)
				this.m_chatbox.innerHTML = "";
			
			MainUser.Instance.removeFromQueue();
			this.connect();
		}
	}

	public onUserStatusChanged(status: UserStatus)
	{
		if (status == UserStatus.BUSY || status == UserStatus.UNAVAILABLE)
			this.displayMessage(utils.serverReply("no message will be display"));
	}

	public disconnect()
	{
		console.log("disconnecting");
		MainUser.Instance?.removeFromQueue();
		this.m_ws?.close();
		this.m_isConnected = false;
		if (this.m_chatbox)
			this.m_chatbox.innerHTML = "";
	}

	private sendMsgFromInput(event: any)
	{
		if (!MainUser.Instance)
			return ;

		if (event.key == 'Enter' && this.m_chatInput && this.m_chatInput.value != "")
		{
			this.sendMsg(MainUser.Instance, this.m_chatInput.value);
			this.m_chatInput.value = "";
		}
	}

	private async populateConnections(connectionsId: number[])
	{
		this.m_connections = [];
		if (!MainUser.Instance)
			return ;

		for (let i = 0; i < connectionsId.length; i++)
		{
			const id = connectionsId[i];
			if (id == MainUser.Instance.id || id == -1)
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

		console.log(json);
		if ("connections" in json)
		{
			const connectionsId = json.connections;
			this.populateConnections(connectionsId);
		}

		if (json.flag && json.flag === "health")
		{
			fetch("/api/chat/healthCallback", {
				method: "POST",
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					token: MainUser.Instance?.token
				})
			});
			return ;
		}

		if (message == "START" && json.gameId && json.mode)
		{
			MainUser.Instance?.gameRouter?.navigateTo("game", json.mode);
			this.startGameCb(json);
			return ;
		}
		const user = new User();
		user.setUser(-1, username, "", "", UserStatus.UNKNOW);
		const newMsg = new Message(user, message, json);

		if (this.user?.status != UserStatus.UNAVAILABLE && this.user?.status != UserStatus.BUSY)
			this.displayMessage(newMsg);
		window.dispatchEvent(new CustomEvent('pageChanged'));
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
		var newMsg = new Message(sender, msg, null);

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
		this.m_onStartGame.forEach(cb => cb(json));
	}
}

