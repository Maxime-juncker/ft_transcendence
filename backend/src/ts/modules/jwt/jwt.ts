import * as base64Url from 'modules/jwt/base64Url.js'
import { Logger } from 'modules/logger.js';

/**
 * create new jwt token
 * @param payload json to encode
 * @param secret encryption key
 * @returns new jwt string
 */
export async function jwtCreate(payload: any, secret: string): Promise<string>
{
	const header =
	{
		algo: 'HS256',
		type: 'JWT'
	}

	const now = Math.floor(Date.now() / 1000)
	const exp = now + 604800

	const completePayload =
	{
		...payload,
		iat: now,
		exp
	}

	const encodedHeader = base64Url.encode(JSON.stringify(header))
	const encodedPayload = base64Url.encode(JSON.stringify(completePayload))

	const toSign = `${encodedHeader}.${encodedPayload}`
	const signature = await calcSign(toSign, secret)

	return `${toSign}.${signature}`
}

/**
 * verify if jwt is valid
 * @param token jwt token to verify
 * @param secret secret used in jwtCreate
 * @returns a json containing data or null if jwt invalid
 */
export async function jwtVerif(token: string, secret: string): Promise<any | null>
{
	try
	{
		const parts = token.split('.')
		if (parts.length !== 3)
			return null

		const [rawHeader, rawPayload, rawSignature] = parts
		const header = JSON.parse(base64Url.decode(rawHeader))
		if (header.algo !== 'HS256')
			throw new Error('Erreur: algorithme de hashage non supporté (actuellement seul HS256 est supporté)')

		const payload = JSON.parse(base64Url.decode(rawPayload))
		if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
		{
			Logger.log('Token expiré')
			return null
		}

		const toSign = `${rawHeader}.${rawPayload}`
		if (rawSignature !== await calcSign(toSign, secret))
		{
			Logger.log('Token JWT invalide')
			return null
		}

		return payload
	}
	catch(err)
	{
		Logger.error('JWT invalide:', err)
		return null
	}
}

async function calcSign(toSign: string, secret: string): Promise<string>
{
	const hexaSign = await hmacSha256(secret, toSign)
	const binSign = Uint8Array.from(hexaSign.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
	return base64Url.encode(String.fromCharCode(...binSign))
}

async function hmacSha256(secret: string, data: string): Promise<string>
{
	const encoder = new TextEncoder()
	const encodedSecret = encoder.encode(secret)
	const encodedData = encoder.encode(data)
	const key = await crypto.subtle.importKey(
		'raw',
		encodedSecret,
		{ name: 'HMAC', hash: 'SHA-256'},
		false,
		['sign']
	)

	const signature = await crypto.subtle.sign('HMAC', key, encodedData)

	return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}
