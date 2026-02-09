import { GameServer } from "modules/game/GameServer.js";
import { core, chat } from "core/server.js";
import fs from 'fs';

const colors = {
	reset:	'\x1b[0m',
	red:	'\x1b[31m',
	green:	'\x1b[32m',
	yellow:	'\x1b[33m',
	blue:	'\x1b[34m',
	gray:	'\x1b[90m',
	orange:	'\x1b[38;5;208m',
};

export class Logger
{
	private static readonly logPath = "/var/log/backend/ft_transcendence.log";

	constructor() {}

	private static getTimeFormated()
	{
		return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"})).toISOString().slice(0, 19).replace('T', ' ').slice(11);
	}

	private static getTimeISO()
	{
		return new Date().toISOString();
	}

	private static createData(level: string, ...args: any): string
	{
		var str = "";
		args.forEach((arg: any) => {
			str += arg;
		});

		const ongoingGame = GameServer.Instance ? GameServer.Instance.activeGames.size : 0;
		const data = JSON.stringify({
			level: level,
			message: str,
			time: Logger.getTimeISO(),
			stats: {
				ongoing_matches: ongoingGame,
				connected_users: chat.connections.size,
				registerUser: core.userCount,
				totalGamePlayed: core.gameCount
			}
		}) + "\n";

		return data;
	}

	private static writeLog(level: string, ...args: any)
	{
		const data = Logger.createData(level, args);
		fs.appendFile(Logger.logPath, data, (err) => {
			if (err)
				console.error(`Error while writting log: ${err}`);
		})
	}

	public static log(...args: any)
	{
		Logger.writeLog("INFO", args);
		console.log(`${Logger.getTimeFormated()} ${colors.gray}[LOG]    ${colors.reset}`, ...args);
	}

	public static success(...args: any)
	{
		Logger.writeLog("SUCCESS", args);
		console.log(`${Logger.getTimeFormated()} ${colors.green}[SUCCESS]${colors.reset}`, ...args);
	}

	public static warn(...args: any)
	{
		Logger.writeLog("WARNING", args);
		console.log(`${Logger.getTimeFormated()} ${colors.orange}[WARN]   ${colors.reset}`, ...args);
	}

	public static error(...args: any)
	{
		Logger.writeLog("ERROR", args);
		console.log(`${Logger.getTimeFormated()} ${colors.red}[ERROR]  ${colors.reset}`, ...args);
	}

	public static debug(...args: any)
	{
		Logger.writeLog("DEBUG", args);
		console.log(`${Logger.getTimeFormated()} ${colors.blue}[DEBUG]  ${colors.reset}`, ...args);
	}

}
