import crypto from 'crypto';
import base32Decode from 'base32-decode';
import base32Encode from 'base32-encode';
import qrcode from 'qrcode';
import { Logger } from 'modules/logger.js';
import { core, DbResponse } from 'core/server.js';

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
	return totp === expected;
}

export async function new_totp(user_id: number, email: string): Promise<DbResponse>
{
	Logger.log("Received request for new totp");
	const sql = "UPDATE users SET totp_seed = ? WHERE id = ?";

	const seed = base32Encode(crypto.randomBytes(20), 'RFC4648');
	const otpauth = "otpauth://totp/Transcendence:" + email + "?secret=" + seed + "&issuer=Transcendence";
	try
	{
		const row = await core.db.get(sql, [seed, user_id]);
		const url = await qrcode.toDataURL(otpauth)
		return { code: 200, data: { qrcode: `${url}` }};
	}
	catch (err: any)
	{
		return { code: 500, data: { message: `error: ${err.message}` }};
	}
}

export async function del_totp(user_id: number): Promise<DbResponse>
{
	const sql = "UPDATE users SET totp_seed = 0, totp_enable = 0 WHERE id = ?";

	try
	{
		const row = await core.db.get(sql, user_id);
		return { code: 200, data: { message: "ok"}};
	}
	catch (err: any)
	{
		return { code: 500, data: { message: `database error: ${err.message}` }};
	}
}

export async function validate_totp(user_id: number, totp: string): Promise<DbResponse>
{
	const sql = "SELECT totp_seed FROM users WHERE id = ?";

	try
	{
		const row = await core.db.get(sql, user_id)
		if (check_totp(row.totp_seed, totp))
		{
			const sql = "UPDATE users SET totp_enable = 1 WHERE id = ?";
			await core.db.get(sql, [user_id])

			return { code: 200, data: { message: "ok, totp fully enabled" }};
		}
		else
			return { code: 404, data: { message: "failed to validate totp" }};
	}
	catch (err: any)
	{
		return { code: 500, data: { message: `database error: ${err.message}` }};
	}
}
