import { Logger } from './Logger.js';
import { runTests } from 'Test.js';

if (!process.env.RUN_BENCHMARK || process.env.RUN_BENCHMARK != "1")
{
	Logger.log("benchmark disable, exiting (set RUN_BENCHMARK=1 to enable)");
	process.exit(0);
}


const maxConnRetry = 5;

function sleep(ms: number)
{
	return new Promise(resolve => setTimeout(resolve, ms));
}

Logger.log("awaiting for backend");
for (var i = 0; i < maxConnRetry; i++)
{
	try
	{
		await fetch(`http://backend:3000/api/chat/ping`);
		Logger.success("connection to backend succesful");
		break;
	}
	catch (e)
	{
		Logger.error(`failed to connect to backend (${maxConnRetry - i} retry left)`);
	}
	await sleep(5000);

}

if (i == 5)
{
	Logger.error("backend did not respond, aborting!");
	process.exit(1);
}

runTests();

Logger.log("benchmark over, bye.");
