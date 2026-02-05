import { Logger } from "Logger.js";

export type TestResult = {
	code: number;
	data: any;
};

export class Routine
{
	private m_name: string;
	private m_iter: number;
	private m_success: number = 0;

	private m_fn: (i: number) => Promise<TestResult>;

	private m_start: any;
	private m_end: any;

	constructor(name: string, fn: (i: number) => Promise<TestResult>, iter: number)
	{
		this.m_name = name;
		this.m_fn = fn;
		this.m_iter = iter;
	}

	public async run(expetedRes: number): Promise<number>
	{
		this.m_start = performance.now();
		for (var i = 0; i < this.m_iter; i++)
		{
			try
			{
				const res = await this.m_fn(i);
				if (res.code == expetedRes)
					this.m_success++;
				else
				{
					Logger.error(`${this.m_name.padEnd(25, '.')}: ${res.code} ERR`);
					Logger.error(`\tinfo: ${JSON.stringify(res.data, null, 2)}`);
				}
			}
			catch (err)
			{
				Logger.error(`${this.m_name}: crash when running test, aborting. err: ${err}`);
				this.m_end = performance.now();
				return 1;
			}
		}
		this.m_end = performance.now();
		return 0;
	}

	public result()
	{
		const success = this.m_success == this.m_iter;
		Logger.log("");
		Logger.log(`+++ ${this.m_name.toUpperCase()} +++`);
		if (success)
			Logger.success(`${this.m_success}/${this.m_iter.toString().padEnd(15, '.')}: SUCCESS`);
		else
			Logger.error(`${this.m_success}/${this.m_iter.toString().padEnd(15, '.')}: SUCCESS`);
		Logger.log(`${this.m_name} took ${this.m_end - this.m_start}ms to complete`);
		Logger.log(`++++\n`);
	}
}
