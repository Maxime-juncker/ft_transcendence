import { Message } from "./chat.js";
import * as utils from './chat_utils.js';

export async function block(id: number, username: string) : Promise<Message>
{
	const url = `/api/user/block/${id}/${username}`;
	const response = await fetch(url, { method: "POST" });
	const json = await response.json();

	return utils.serverReply(JSON.stringify(json, null, 2));
}

export async function unblock(id: number, username: string) : Promise<Message>
{
	const url = `/api/user/unblock/${id}/${username}`;
	const response = await fetch(url, { method: "DELETE" });
	const json = await response.json();

	return utils.serverReply(JSON.stringify(json, null, 2));
}

export async function getBlocked(id: number) : Promise<Message>
{
	const url = `/api/user/get_blocked_users/${id}`;
	const response = await fetch(url);
	const json = await response.json();

	return utils.serverReply(JSON.stringify(json, null, 2));
}
