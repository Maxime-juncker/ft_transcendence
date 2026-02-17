import { core, chat, DbResponse } from 'core/server.js';
import { getUserById } from './user.js';
import { GameServer } from 'modules/game/GameServer.js';
import { getUserName } from './user.js';

type Duel = {
	senderId:	number,
	id:			number,
};

var duels = Array<Duel>();

function findDuel(senderId: number, id: number): Duel | null
{
	for (let i = 0; i < duels.length;  i ++) {
		const el = duels[i];
		if (el.senderId == senderId && el.id == id)
			return el;
	}
	return null;
}

function removeDuel(duel: Duel)
{
	const idx = duels.indexOf(duel);
	duels.splice(idx, 1);
}

export async function inviteDuel(senderId: number, id: number): Promise<DbResponse>
{
	if (senderId === id)
		return { code: 400, data: { message: "you can't invite yourself" }};

	// checking if user is valid
	var res = await getUserById(id, core.db);
	if (res.code != 200)
		return res;

	if (findDuel(senderId, id))
		return { code: 200, data: { message: "awaiting user response" }};

	duels.push({ senderId: senderId, id: id });
	chat.sendTo(id, chat.serverMsg(`${await getUserName(senderId)} is inviting you for a duel\n(/acceptDuel | /declineDuel)`));
	return { code: 200, data: { message: "invite sent" }};
}

export async function listPendings(id: number): Promise<DbResponse>
{
	const userDuels: Duel[] = [];
	duels.forEach((duel: Duel) => {
		if (duel.id == id || duel.senderId == id)
			userDuels.push(duel);
	});

	const data = JSON.stringify(userDuels);
	return { code: 200, data: data };
}

export async function declineDuel(senderId: number, id: number): Promise<DbResponse>
{
	var duel = null;
	duel = findDuel(senderId, id);
	if (!duel)
		duel = findDuel(id, senderId);
	if (!duel)
		return { code: 404, data: { message: "invite not found" }};
	removeDuel(duel);
	chat.sendTo(id, chat.serverMsg(`${await getUserName(senderId)} has declined the invite.`, "duelDeclined"));

	return { code: 200, data: { message: "invite has been declined" }};
}

export async function acceptDuel(senderId: number, id: number): Promise<DbResponse>
{
	if (!GameServer.Instance)
		return { code: 500, data: { message: "server error" }};
	if (findDuel(senderId, id))
		return { code: 200, data: { message: "can't accept own invite" }};
	var duel = findDuel(id, senderId);
	if (!duel)
		return { code: 404, data: { message: "invite not found" }};

	removeDuel(duel);
	const gameId = await GameServer.Instance.startDuel(senderId, id);

	chat.sendTo(id, chat.serverMsg(`${await getUserName(senderId)} accepted your invite.`));
	chat.sendTo(senderId, chat.serverMsg(`${await getUserName(id)} accepted your invite.`));

	return { code: 200, data: { id: gameId, message: "starting game" }};
}

/**
 * decline all duel of user
 * @param id id of user to clear
*/
export function clearDuel(id: number)
{
	for (let i = 0; i < duels.length; i++)
	{
		const duel = duels[i];
		if (duel.id == id || duel.senderId == id)
			declineDuel(duel.id, duel.senderId);
	}
}
