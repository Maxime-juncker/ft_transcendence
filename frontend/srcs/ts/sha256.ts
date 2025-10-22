class sha256
{
	constructor(parameters)
	{
		
	}
}

// Todo: change using sha256
export function hashString(name: string)
{
	let hash = 0;

	for	(let i = 0; i < name.length; i++)
	{
		let c = name.charCodeAt(i);
		hash = ((hash << 5) - hash) + c;
		hash = hash & hash;
	}
	return hash;
}
