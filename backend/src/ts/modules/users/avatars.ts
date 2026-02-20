import { core, DbResponse } from "core/server.js";
import { Logger } from "modules/logger.js";
import { hashString } from "modules/sha256.js";
import { getUserById } from "./user.js";
import fs from 'fs';
import path from 'path';
import { MultipartFile } from "@fastify/multipart";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export async function updateAvatarPath(id: number, filename: string)
{
	const sql = "UPDATE users SET avatar = ? WHERE id = ?";
	await core.db.run(sql, ["/public/avatars/" + filename , id]);
}

async function validateMime(buffer: Buffer): Promise<boolean>
{
	const expected = ['image/png', 'image/jpeg', 'image/gif'];
	const type = await fileTypeFromBuffer(buffer);
	if (!type)
		return false;
	return expected.includes(type.mime);
}

async function validateImage(buffer: Buffer): Promise<boolean>
{
	const expected = ['png', 'jpeg', 'gif'];
	try
	{
		const metadata = await sharp(buffer).metadata();
		if (!metadata)
			return false;
		return expected.includes(metadata.format);
	}
	catch (err)
	{
		Logger.error("count not validate image:", err);
		return false;
	}
}

async function validateUpload(buffer: Buffer): Promise<DbResponse>
{
	const mime = await validateMime(buffer);
	if (!mime)
	{
		Logger.error("invalid mime type", mime);
		return { code: 400, data: { message: "file type allowed: png / jpeg / gif" }};
	}

	if (await validateImage(buffer) == false)
	{
		Logger.error("could not process image");
		return { code: 400, data: { message: "could not process image" }};
	}

	return { code: 200, data: { message: "ok" }};
}

export async function uploadAvatar(file: MultipartFile, id: number): Promise<DbResponse>
{
	try
	{
		const buffer = await file.toBuffer()
		var res = await validateUpload(buffer);
		if (res.code != 200)
			return res;

		res = await getUserById(id, core.db);
		if (res.code != 200)
			return res;

		const filename = await hashString(res.data.email) + await hashString(file.filename);
		const filepath = path.join("/var/www/server/public/avatars/", filename);

		await fs.promises.writeFile(filepath, buffer);
		await updateAvatarPath(Number(res.data.id), filename);

		Logger.log(`${res.data.name} has changed is avatar. location=${filepath}`);

		return { 
			code: 200, data: {
				Success:	true,
				filename:	filename,
				mimetype:	file.mimetype,
				encoding:	file.encoding,
			}
		};
	}
	catch (error)
	{
		Logger.error(`failed to process image: ${error}`);
		return { code: 500, data: { message: "failed to process file" }};
	}
}
