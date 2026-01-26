import { User, UserStatus } from "modules/user/User.js";
import { Message } from "./chat.js";

export function applyMsgStyle(msg: string) : string
{
	return `[${msg}]`;
}

export function serverReply(msg: string) : Message
{
	const user = new User();
	user.setUser(-1, "<SERVER>", "", "", UserStatus.UNKNOW);
	return new Message(user, msg, null);
}
