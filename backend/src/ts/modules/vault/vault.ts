import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { Client } from "@litehex/node-vault";

const vc = new Client({
  apiVersion: 'v1',
  endpoint: 'http://vault:8200'
});

const mountPath = "transcendence";
const keyFile = '/vault/config/unseal-key.txt';
const tokenFile = '/vault/config/root-token.txt';
let unsealKey = '';
let rootToken = '';

async function readFiles() {
  if (existsSync(keyFile) && existsSync(tokenFile)) {
    unsealKey = (await readFile(keyFile, 'utf-8')).trim();
    rootToken = (await readFile(tokenFile, 'utf-8')).trim();
	}
}

async function writeFiles() {
	await writeFile(keyFile, unsealKey);
  await writeFile(tokenFile, rootToken);
}

async function configureVault() {
	await readFiles();

	if (unsealKey === '' || rootToken === '') {
		const init = await vc.init({ secret_shares: 1, secret_threshold: 1 });
		console.log(init);

		if (init && init.data) {
			const { keys, root_token } = init.data;
			unsealKey = keys[0];
			rootToken = root_token;
			await writeFiles();
			return 1;
		}
		else
			throw new Error("Error initializing Vault");
	}

	return 0;
}

async function unsealVault() {
	vc.token = rootToken;
	const unsealed = await vc.unseal({ key: unsealKey });
	console.log(unsealed);
};

async function mountVault() {
	const mounted = await vc.mount({
	  mountPath: mountPath,
	  type: 'kv-v2'
	});

	if (!mounted.data)
		throw new Error("Error mounting Hashi Corp Vault !");
	else
		console.log("Successfully mounted Vault");
}

export async function initVault() {

	const init = await configureVault();
	await unsealVault();
	if (init)
		await mountVault();
};

export async function createSecret(name: string, value: object) {

	const write = await vc.kv2.write({
		mountPath,
		path: name,
		data: value
	});

	return (write.data?.data?.created_time && write.data?.data?.version > 0);
};

export async function readSecret(name: string) {

	const read = await vc.kv2.read({
		mountPath,
		path: name
	});

	return (read.data?.data?.data);
};

export async function deleteSecret(name: string) {

	const deleted = await vc.kv2.deleteLatest({
		mountPath,
		path: name
	});

	return (deleted.data);
};