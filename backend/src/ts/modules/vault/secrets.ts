import { createSecret, readSecret } from '@modules/vault/vault.js';

export async function getJwtSecret() {

	const secret = await readSecret('jwt');
	if (!secret) {
		const newSecret = await generateSecret();
		createSecret('jwt', { value: newSecret });
		return newSecret;
	}
	else
		return secret.value;
};

function generateSecret(
  length: number = 32
): string {

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
}