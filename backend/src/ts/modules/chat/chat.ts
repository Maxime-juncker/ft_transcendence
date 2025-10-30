import { getDB } from '@core/server.js';
import { getUserByName, getUserStats } from '@modules/users/user.js';
const connections = new Set();

async function handleCommand(str: string, connection) : Promise<string>
{
	const args: string[] = str.split(/\s+/);
	var response: any;
	switch (args[0])
	{
		case "/inspect":
			response = await getUserByName(args[1], getDB());
			return JSON.stringify(response.data);
		case "/stats":
			response = await getUserStats(args[1], getDB());
			return JSON.stringify(response[1]);
		case "/ping":
			return "pong";
		default:
			return "Command not found"
	}
}

async function onMessage(message: any, connection: any, clientIp: any)
{
	try
	{
			const msg = message.toString();
			const json = JSON.parse(message);
			if (json.isCmd === true)
			{
				const result = await handleCommand(json.message, connection);
				const str = JSON.stringify({
					username: "<SERVER>",
					message: result
				});
				console.log(str);
				connection.send(str);
				return ;
			}
			console.log(`${clientIp}: ${msg}`);
			broadcast(msg, connection);
		}
	catch (err)
	{
		console.log(`failed to process message: ${err}`);
	}
}

export function chatSocket(connection: any, request: any)
{
	const clientIp = request.socket.remoteAddress;
	console.log(`Client connected from: ${clientIp}`);
	connection.send(JSON.stringify({ username: "<SERVER>", message: "welcome to room chat!" }));

	connections.add(connection);
	broadcast(JSON.stringify({ username: "<SERVER>", message: `${clientIp}: has joined the room!`}), connection);
	connection.on('message', async (message: any) => onMessage(message, connection, clientIp));

	connection.on('error', (error: any) => {
		console.error(`${clientIp}: websocket error: ${error}`);
	})

	connection.on('close', (code: any, reason: any) => {
		connections.delete(connection);
		broadcast(JSON.stringify({ username: "<SERVER>", message: `${clientIp}: has left the room` }), connection);
		console.log(`${clientIp}: disconnected - Code: ${code}, Reason: ${reason?.toString() || 'none'}`);
	});
}

function broadcast(message: any, sender = null)
{
	connections.forEach((conn: any) => {
		if (conn !== sender && conn.readyState === conn.OPEN)
		{
			try
			{
				conn.send(message);
			}
			catch (err: any)
			{
				console.error(`Broadcast error: ${err}`);
				connections.delete(conn);
			}
		}
	})
}
