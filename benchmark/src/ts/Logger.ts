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
	constructor() {}

	private static getTime()
	{
		return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"})).toISOString().slice(0, 19).replace('T', ' ').slice(11);
	}


	public static success(...args: any)
	{
		console.log(`${Logger.getTime()} ${colors.green}[SUCCESS]${colors.reset}`, ...args);
	}

	public static warn(...args: any)
	{
		console.log(`${Logger.getTime()} ${colors.orange}[WARN]   ${colors.reset}`, ...args);
	}

	public static error(...args: any)
	{
		console.log(`${Logger.getTime()} ${colors.red}[ERROR]  ${colors.reset}`, ...args);
	}

	public static debug(...args: any)
	{
		console.log(`${Logger.getTime()} ${colors.blue}[DEBUG]  ${colors.reset}`, ...args);
	}

	public static log(...args: any)
	{
		console.log(`${Logger.getTime()} ${colors.gray}[LOG]    ${colors.reset}`, ...args);
	}
}
