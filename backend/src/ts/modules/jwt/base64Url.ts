export function encode(str: string): string
{
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decode(str: string): string
{
	str = str.replace(/-/g, '+').replace(/_/g, '/')
	while (str.length % 4) str += '='
	return atob(str)
}