import { Chat } from './chat.js';

class Command
{
	private m_name: string = "";
	private m_description: string = "";
	private m_cb: (chat: Chat, argv: Array<string>) => void = () => {};

	get name(): string { return this.m_name; }
	get desc(): string { return this.m_description; }
	get cb(): (chat: Chat, argv: Array<string>) => void { return this.m_cb; }

	constructor(name: string, cb: (chat: Chat, argv: Array<string>) => void, desc: string)
	{
		this.m_name = name;
		this.m_description = desc;
		this.m_cb = cb;
	}
}

export class ChatCommand
{
	private m_cmds = new Array<Command>;
	private m_chat: Chat | null = null;

	constructor(chat: Chat)
	{
		this.m_chat = chat;
	}

	/**
	* Register a command that can be called by the chat
	* @param name name of the command
	* @param cb callback function to run
	* @param description (optional) description to show in /help
	*/
	public register(name: string, description: string, cb: (chat: Chat, argv: Array<string>) => void)
	{
		const cmd = new Command(name, cb, description);
		this.m_cmds.push(cmd);
	}

	/**
	* run a command
	* @param name name of the command to run
	* @returns 0 if command is found, 1 if not found or chat == null
	*/
	public run(msg: string): number
	{
		if (!this.m_chat)
			return 1;

		const argv = msg.slice(1).split(' '); // remove '/' and split at spaces
		for (let i = 0; i < this.m_cmds.length; i++)
		{
			const cmd = this.m_cmds[i];
			if (cmd.name == argv[0])
			{
				cmd.cb(this.m_chat, argv);
				return 0
			}
		}

		return 1;
	}

	/**
	 * return help text from all commands
	*/
	public GetHelpTxt() : string
	{
		var msg = "";
		for (let i = 0; i < this.m_cmds.length; i++)
		{
			const cmd = this.m_cmds[i];
			msg += `/${cmd.name} ${cmd.desc}\n`;
		}

		console.log("msg", msg);
		return msg;
	}
}
