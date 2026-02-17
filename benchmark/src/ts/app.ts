import { Logger } from './Logger.js';
import { runTests } from 'Test.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
export var host = "localhost:8081"
export var routePassw = process.env.PROTECTED_ROUTE_PASS;

if (process.argv.length >= 3)
{
	host = process.argv[2];
}

if (process.argv.length >= 4)
{
	routePassw = process.argv[3];
}

if (!process.env.RUN_BENCHMARK || process.env.RUN_BENCHMARK != "1")
{
	Logger.log("benchmark disable, exiting (set RUN_BENCHMARK=1 to enable)");
	process.exit(0);
}


const maxConnRetry = 7;

function sleep(ms: number)
{
	return new Promise(resolve => setTimeout(resolve, ms));
}

Logger.log("awaiting for backend");
for (var i = 0; i < maxConnRetry; i++)
{
	try
	{
		await fetch(`https://${host}/api/chat/ping`);
		Logger.success("connection to backend succesful");
		break;
	}
	catch (e)
	{
		Logger.error(`failed to connect to backend (${maxConnRetry - i} retry left)`);
	}
	await sleep(7000);

}

if (i == 5)
{
	Logger.error("backend did not respond, aborting!");
	process.exit(1);
}

await runTests();

Logger.log("benchmark over, bye.");
