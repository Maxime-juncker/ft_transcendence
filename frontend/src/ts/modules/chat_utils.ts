import { User, UserStatus } from "User.js";
import { Message } from "./chat.js";

export function applyMsgStyle(msg: string) : string
{
	return `[${msg}]`;
}

export function helpMsg() : string
{
	const msg: string = ` -- help --
TERMINAL
	/ping   test connection to server
	/clear	clear chat

GAME MANAGMENT
	/addGame {user1 user2, score1, score2}	add game to history

USER MANAGMENT
	/updateMe {oldPassw, name, email, passw}	update your profile infos
	/stats		{username}						show stats of user
	/inspect	{username}						show info of user
	/addFriend	{username}						send friend request to user
	/getHist	{username}						show matchs history of user
	/block		{username}						block a user
	/unblock	{username}						block a user
	/getblock									list blocked users
`;

	return msg;
}

export function serverReply(msg: string) : Message
{
	const user = new User();
	user.setUser(-1, "<SERVER>", "", "", UserStatus.UNKNOW);
	return new Message(user, msg);
}
