import { randomBytes } from "node:crypto";
import { Routine, TestResult } from "Routine.js";
import { WebSocket } from 'undici'
import { host, routePassw } from "app.js";

type User = {
	id:		number;
	email:	string;
	name:	string;
	passw:	string;
	token:	string;
	ws:		WebSocket | null;
}

function getRandom(max: number)
{
	return Math.floor(Math.random() * max);
}

const users: Array<User> = [];

async function createTest(i: number): Promise<TestResult>
{
	const body = randomLogin(i);
	const res = await fetch(`${host}/api/user/create`, {
		method: "POST",
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	users.push({ id: -1, email: body.email, name: body.username, passw: body.passw, token: "", ws: null });
	const data = await res.json();
	return { code: res.status, data: data };
}

async function tokenExchange(i: number)
{
	if (i >= users.length)
	{
		return { code: -1, data: `out of range: (${i})`}
	}

	const user = users[i];

	const res = await fetch(`${host}/api/user/get_profile_token`, {
		method: "POST",
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			token: user.token
		})
	});
	const data = await res.json();
	if (res.status == 200)
	{
		users[i].id = data.id;
	}

	return { code: res.status, data: data };
}

async function loginTest(i: number): Promise<TestResult>
{
	if (i >= users.length)
	{
		return { code: -1, data: `out of range: (${i})`}
	}

	const user = users[i];

	const res = await fetch(`${host}/api/user/login`, {
		method: "POST",
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			email: user.email,
			passw: user.passw,
			totp: "",
		})
	});
	const data = await res.json();
	if (res.status == 200)
	{
		users[i].token = data.token;
	}

	return { code: res.status, data: data };
}

async function histTest(i: number): Promise<TestResult>
{
	const user = users[i];

	const max = users.length > histReq ? histReq : users.length;
	for (let j = 0; j < max; j++)
	{
		if (j == i)
			continue;

		var r = (i + j + 1) % users.length;
		if (r == i)
			r++;

		const player = users[r];
		const score1 = getRandom(100);
		const score2 = getRandom(100);

		const res = await fetch(`${host}/api/user/add_game`, {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				pass: routePassw,
				user1_id: user.id,
				user2_id: player.id,
				user1_score: score1,
				user2_score: score2
			})
		});

		if (res.status != 200)
			return { code: res.status, data: await res.json() };
	}

	return { code: 200, data: "all game added" };

}

function randomLogin(i: number)
{
	const r = randomBytes(8).toString("hex");
	const id = `${i.toString().padStart(3, '0')}`;
	const email = `test${r}${id}@test${id}.com`;
	const usr = `test${r}${id}`;
	
	return {
		username: usr,
		email: email,
		passw: "Test123"
	};
}

async function logout(i: number): Promise<TestResult>
{
	const user = users[i];

	const res = await fetch(`${host}/api/user/logout`, {
		method: "POST",
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			token: user.token
		})
	})
	return { code: res.status, data: await res.json()}
}

async function addFriends(i: number)
{
	const user = users[i];

	const max = users.length > friendReq ? friendReq : users.length;
	for (let j = 0; j < max; j++)
	{
		if (j == i)
			continue;

		var r = (i + j + 1) % users.length;
		if (r == i)
			r++;

		const player = users[r];

		await fetch(`${host}/api/friends/send_request`, {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: user.token,
				friend_id: player.id
			})
		});
	}

	return { code: 200, data: "all friend request sent" };
}

async function acceptFriends(i: number)
{
	const user = users[i];

	var response = await fetch(`${host}/api/friends/get?user_id=${user.id}`);
	var json = await response.json();
	if (response.status != 200)
		return { code: response.status, data: json };


	for (let i = 0; i < json.length; i++)
	{
		const data = json[i];
		if (json.sender_id == user.id)
			continue;

		const friendId = data.sender_id;

		var response = await fetch(`${host}/api/friends/accept`, {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: user.token,
				friend_id: friendId
			})
		});
	}

	return { code: 200, data: "all request accepted" };
}

async function connectChat(i: number)
{
	const user = users[i];

	user.ws = new WebSocket(`${host}/api/chat?userid=${user.token}`);

	return { code: 200, data: "Ok" };
}

const maxUser = 42;
const friendReq = 5;
const histReq = 15;

export async function runTests()
{
	const r1 = new Routine("CREATE_TEST", createTest, maxUser);
	const r2 = new Routine("LOGIN_USER", loginTest, maxUser);
	const r3 = new Routine("TOKEN_EXCHANGE", tokenExchange, maxUser);
	const r3bis = new Routine("CONN_CHAT", connectChat, maxUser);
	const r4 = new Routine("HISTORY", histTest, maxUser);
	const r6 = new Routine("REQUEST SEND", addFriends, maxUser);
	const r7 = new Routine("REQUEST ACCEPT", acceptFriends, maxUser);
	const r5 = new Routine("LOGOUT", logout, maxUser);

	await r1.run(200);
	await r2.run(200);
	await r3.run(200);
	await r3bis.run(200);
	await r4.run(200);
	await r6.run(200);
	await r7.run(200);
	await r5.run(200);

	r1.result();
	r2.result();
	r3.result();
	r3bis.result();
	r4.result();
	r6.result();
	r7.result();
	r5.result();
}
