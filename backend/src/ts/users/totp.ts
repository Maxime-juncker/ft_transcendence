import crypto from 'crypto';
import base32Decode from 'base32-decode';
import base32Encode from 'base32-encode'
import sqlite3 from "sqlite3";

function generate_totp(seed: string, time: number): string
{
	const key = Buffer.from(base32Decode(seed, 'RFC4648'));
	const T = Math.floor(time / 30);
	const TBuffer = Buffer.alloc(8);
	TBuffer.writeBigInt64BE(BigInt(T));

	const hmac = crypto.createHmac('sha1', key).update(TBuffer).digest();
	return hmac.toString('hex');
}

function transform_totp_code(hmac: Buffer): string
{
	const offset = hmac[hmac.length - 1] & 0x0F;
	const code = (hmac.readUInt32BE(offset) & 0x7FFFFFFF) % 1000000;
	return code.toString().padStart(6, '0');
}

export function check_totp(seed: string, totp: string): boolean
{
	const expected = transform_totp_code(Buffer.from(generate_totp(seed, Math.floor(Date.now() / 1000)), 'hex'));
	console.log("Time: " + Date.now());
	console.log("Expected totp: " + expected);
	console.log("Actual totp: " + totp);
	return totp === expected;
}

export function new_totp(request: any, reply: any, db: sqlite3.Database)
{
	console.log("Received request for new totp");
	const { user_id } = request.body;
	const sql = "UPDATE users SET totp_seed = ?, totp_enable = true WHERE id = ?";

	const seed = base32Encode(crypto.randomBytes(20), 'RFC4648');
	db.get(sql, [seed, user_id], function (err:any)
	{
		if (err)
			reply.code(500).send({ message: `database error: ${err.message}` });
		else
			reply.code(200).send({ seed: `${seed}` });
	})
}
