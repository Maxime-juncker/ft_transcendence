import { createSecret, readSecret } from 'modules/vault/vault.js';

export interface OAuthSecrets {
  google: { id: string; secret: string };
  github: { id: string; secret: string };
  ft: { id: string; secret: string };
};

export async function getJwtSecret() {

	const secret = await readSecret('jwt');
	if (!secret) {
		const newSecret = await generateNewJwt();
		createSecret('jwt', { value: newSecret });
		return newSecret;
	}
	else
		return secret.value;
};

function generateNewJwt(
  length: number = 32
): string {

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
};

export async function getSecrets() {
	const googleId = await readSecret('googleId');
	const googleSecret = await readSecret('googleSecret');
	const githubId = await readSecret('githubId');
	const githubSecret = await readSecret('githubSecret');
	const ftId = await readSecret('ftId');
	const ftSecret = await readSecret('ftSecret');
	if(!googleId || !googleSecret || !githubId || !githubSecret || !ftId || !ftSecret) {
		const newSecrets = await getSecretsFromEnv();
		createSecret('secrets', newSecrets);
		createSecret('googleId', { value: newSecrets.google.id });
		createSecret('googleSecret', { value: newSecrets.google.secret });
		createSecret('githubId', { value: newSecrets.github.id });
		createSecret('githubSecret', { value: newSecrets.github.secret });
		createSecret('ftId', { value: newSecrets.ft.id });
		createSecret('ftSecret', { value: newSecrets.ft.secret });
		return newSecrets;
	}
	else {
		const secrets = {
    	google: {
    	  id: googleId.value,
    	  secret: googleSecret.value
    	},
    	github: {
    	  id: githubId.value,
    	  secret: githubSecret.value
    	},
    	ft: {
    	  id: ftId.value,
    	  secret: ftSecret.value
    	}
  	};
		return secrets;
	}
};

export function getSecretsFromEnv(): OAuthSecrets {
  return {
    google: {
      id: process.env.GOOGLE_ID!,
      secret: process.env.GOOGLE_SECRET!
    },
    github: {
      id: process.env.GITHUB_ID!,
      secret: process.env.GITHUB_SECRET!
    },
    ft: {
      id: process.env.FT_ID!,
      secret: process.env.FT_SECRET!
    }
  };
};
