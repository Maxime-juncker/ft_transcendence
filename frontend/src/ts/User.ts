import { hashString } from './sha256.js'
import { UserElement, UserElementType } from './UserElement.js';

// *********************** TODO *********************** //
// user with large name should be trucated
// Add settings page									//
// **************************************************** //

export enum UserStatus {
	UNKNOW = -2,
	UNAVAILABLE = -1,
	AVAILABLE = 0,			// user online
	BUSY,				// overide IN_GAME / AVAILABLE
	INVISIBLE,			// overide IN_GAME / AVAILABLE same ui as unavailable
	IN_GAME,			// show when user in game
}

export enum AuthSource {
	BOT = -2,	// for bot account
	GUEST = -1, // guest profile are deleted on logout
	INTERNAL = 0,
	GOOGLE, // not used anymore
	GITHUB,
	FORTY_TWO
}

async function getUserInfoFromId(id: number): Promise<Response> {
	var response = await fetch(`/api/user/get_profile_id?user_id=${id.toString()}`);
	return response;
}

export async function getUserFromName(name: string): Promise<User> {
	var response = await fetch(`/api/user/get_profile_name?profile_name=${name}`);
	if (response.status != 200)
		return null

	const data = await response.json();
	var user = new User();
	var status = data.is_login ? data.status : UserStatus.UNAVAILABLE;
	user.setUser(data.id, data.name, "", data.avatar, status);
	await user.updateSelf();
	return user;
}

export async function getUserFromId(id: number): Promise<User> {
	const response = await getUserInfoFromId(id);
	if (response.status != 200)
		return null

	const data = await response.json();
	var user = new User();
	var status = data.is_login ? data.status : UserStatus.UNAVAILABLE;
	user.setUser(data.id, data.name, "", data.avatar, status);
	return user;
}

export interface Stats {
	gamePlayed:	number;
	gameWon:	number;
	currElo:	number;
	maxElo:		number;
	avrTime:	string;
	shortTime:	string;
}

export class User {
	/* public vars */
	public name: string;

	/* private vars */
	private m_id: number;

	private m_email: string;
	private m_avatarPath: string;

	private m_friends: User[]; // accepted request
	private m_pndgFriends: Map<User, number>; // pending requests (number == sender)
	private m_status: UserStatus;
	private m_created_at: string;

	private m_stats:	Stats;
	private m_source:	AuthSource;

	constructor() {
		this.setUser(
			-1,
			"Guest",
			"",
			"", // TODO: add default avatar
			UserStatus.UNKNOW
		);

		this.m_stats = { gamePlayed: 0, gameWon: 0, currElo: 0, maxElo: 0, avrTime: "", shortTime: "" };
		this.m_source = AuthSource.GUEST;
	}

	public setUser(id: number, name: string, email: string, avatar: string, status: UserStatus) {
		this.m_id = id;
		this.name = name;
		this.m_email = email;
		this.m_avatarPath = avatar;
		this.m_status = status;
		this.m_friends = [];
		this.m_pndgFriends = new Map<User, number>();
	}

	public getStatus(): UserStatus { return this.m_status; }
	public get friends(): User[] { return this.m_friends; }
	public get pndgFriends(): Map<User, number> { return this.m_pndgFriends; }
	public get id(): number { return this.m_id; }
	public getEmail(): string { return this.m_email; }
	// public getAvatarPath() : string { return this.m_avatarPath + "?" + new Date().getTime(); }
	public getAvatarPath(): string { return this.m_avatarPath; }
	
	get		created_at(): string	{ return this.m_created_at; }
	get		stats(): Stats			{ return this.m_stats; }
	get		source(): AuthSource	{ return this.m_source; }

	public async setStatus(status: UserStatus): Promise<Response> {
		this.m_status = status;

		var response = await fetch("/api/user/set_status", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				user_id: this.id.toString(),
				newStatus: this.m_status.toString()
			})
		});
		return response;
	}


	public async logoutDB() {
		const response = await fetch("/api/user/logout", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.id.toString(),
			})
		});
		this.setUser(-1, "Guest", "", "", UserStatus.UNKNOW);
		return response;
	}

	public async updateFriendList(): Promise<number> {
		this.m_friends = [];
		this.m_pndgFriends = new Map<User, number>();

		const params = { user_id: this.id.toString() };
		const queryString = new URLSearchParams(params).toString();
		var response = await fetch(`/api/friends/get?${queryString}`);
		var data = await response.json();

		for (let i = 0; i < data.length; i++) {
			const element = data[i];
			
			var id = element.user1_id == this.id ? element.user2_id : element.user1_id;
			if (data[i].pending)
				this.m_pndgFriends.set(await getUserFromId(id), data[i].sender_id);
			else
				this.m_friends.push(await getUserFromId(id));
		}
		return 0;
	}

	public async updateSelf(): Promise<number> {
		if (this.id == -1)
			return 1;

		var response = await getUserInfoFromId(this.id);
		if (response.status != 200)
			return response.status;

		var data = await response.json();
		this.name = data.name;
		this.m_avatarPath = data.avatar;
		this.m_status = data.status;
		this.m_created_at = data.created_at;
		this.m_source = data.source;

		this.m_stats.gamePlayed = data.games_played;
		this.m_stats.gameWon = data.wins;
		this.m_stats.currElo = data.elo;

		await this.updateFriendList();

		return response.status;
	}

	protected async addFriendToDB(friend_name: string): Promise<number> {
		var response = await fetch("/api/friends/send_request", {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.id.toString(),
				friend_name: friend_name
			})
		});
		return response.status;
	}

	public async uploadAvatar(file: FormData): Promise<any> {

		var response = await fetch("/api/user/upload/avatar", {
			method: "POST",
			body: file,
		});
		var data = await response.json();
		this.m_avatarPath = "/public/avatars/" + data.filename;

		return response;
	}
}

function newOption(optionName: string) : HTMLOptionElement
{
	var option: HTMLOptionElement;

	option = document.createElement("option");
	option.innerText = optionName;
	option.value = optionName;
	return option;
}

export class MainUser extends User
{

	private m_userElement: UserElement;
	private m_onLoginCb:	Array<(user: MainUser) => void>;
	private m_onLogoutCb:	Array<(user: MainUser) => void>;

	constructor(parent: HTMLElement)
	{
		super()
		
		if (parent)
		{
			this.m_userElement = new UserElement(null, parent, UserElementType.MAIN);

			const statusSelect = this.m_userElement.getElement("#status") as HTMLSelectElement;
			statusSelect.prepend(newOption("available"));
			statusSelect.prepend(newOption("unavailable"));
			statusSelect.prepend(newOption("busy"));
			statusSelect.prepend(newOption("in_game"));
			statusSelect.addEventListener("change", () => this.updateStatus(statusSelect.value, this, this.m_userElement));
		}

		this.m_onLoginCb = [];
		this.m_onLogoutCb = [];
	}

	public onLogin(cb: ((user: MainUser) => void)) { this.m_onLoginCb.push(cb); }
	public onLogout(cb: ((user: MainUser) => void)) { this.m_onLogoutCb.push(cb); }

	public async oauth2Login(id: string, source: number) {
		var response = await fetch(`/api/oauth2/login`, {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: id,
				source: source
			})
		});
		const data = await response.json();

		if (response.status == 200) {
			var status = data.status;
			this.setUser(data.id, data.name, data.email, data.avatar, status);
			this.setStatus(this.getStatus());
			await this.refreshSelf();

			this.m_onLoginCb.forEach(cb => cb(this));
		}

		return { status: response.status, data: data };
	}

	public async loginSession()
	{
		const response = await fetch("/api/user/get_session");
		const data = await response.json();

		if (response.status == 200) {
			var status = data.status;
			this.setUser(data.id, data.name, data.email, data.avatar, status);
			this.setStatus(this.getStatus());
			await this.refreshSelf();

			this.m_onLoginCb.forEach(cb => cb(this));
		}
	}

	public async login(email: string, passw: string, totp: string): Promise<{ status: number, data: any }> {
		if (this.id != -1)
			return { status: -1, data: null };

		const response = await fetch("/api/user/login", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				email: email,
				passw: await hashString(passw),
				totp: totp
			})
		});
		const data = await response.json();
		await this.loginSession();
		return { status: response.status, data: data };
	}

	public async logout()
	{
		await this.logoutDB();
		if (this.m_userElement)
			this.m_userElement.updateHtml(null);

		this.m_onLogoutCb.forEach(cb => cb(this));
	}

	public async refreshSelf()
	{
		if (this.id == -1)
			return;
		await this.updateSelf();
		if (this.m_userElement)
			this.m_userElement.updateHtml(this);
	}

	private async updateStatus(newStatus: string, user: User, userHtml: UserElement)
	{
		switch (newStatus) {
			case "available":
				await user.setStatus(UserStatus.AVAILABLE);
				break;
			case "unavailable":
				await user.setStatus(UserStatus.UNAVAILABLE);
				break;
			case "busy":
				await user.setStatus(UserStatus.BUSY);
				break;
			case "in_game":
				await user.setStatus(UserStatus.IN_GAME);
				break;
			case "debug":
				await user.setStatus(UserStatus.UNKNOW);
				break;
			default:
				await user.setStatus(UserStatus.UNKNOW);
				break;
		}
		userHtml.updateHtml(user);
	}

	public async setAvatar(file: FormData): Promise<number> // TODO: check si multipart upload ok
	{
		if (this.id == -1)
			return 1;
		if (!file)
			return 2;

		await this.uploadAvatar(file);
		if (this.m_userElement)
			this.m_userElement.updateHtml(this);

		return 0;
	}

	public async removeFriend(user: User): Promise<Response> {
		const url = `/api/friends/remove/${this.id}/${user.id}`;
		const response = await fetch(url, { method: "DELETE" });

		await this.updateSelf();

		return response;
	}

	public async acceptFriend(user: User): Promise<Response> {
		const url = `/api/friends/accept/${this.id}/${user.id}`;
		const response = await fetch(url, { method: "POST" });

		await this.updateSelf();

		return response;
	}


	public async addFriend(friend_name: string): Promise<number> {
		if (!friend_name || friend_name == "")
			return 1;
		if (this.id == -1)
			return 2;

		const status = await this.addFriendToDB(friend_name);
		await this.updateSelf();

		return status;
	}

	public async newTotp() : Promise<{status: number, data: any}>
	{
		if (this.id == -1)
			return null;

		var response = await fetch("/api/totp/reset", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.id.toString(),
				email: this.getEmail(),
			})
			
		});
		var data = await response.json();
		return { status: response.status, data: data };
	}

	public async delTotp() : Promise<number>
	{
		if (this.id == -1)
			return 404;

		var response = await fetch("/api/totp/remove", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.id.toString(),
			})
			
		});

		return response.status;
	}

	public async validateTotp(totp: string) : Promise<number>
	{
		if (this.id == -1)
			return 404;

		var response = await fetch("/api/totp/validate", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.id.toString(),
				totp: totp,
			})
			
		});

		return response.status;
	}

	public async deleteUser(): Promise<number>
	{
		const res = await fetch ('api/user/delete', {
			method: "DELETE",
		});
		this.logout();
		return res.status;
	}

	public async resetUser(): Promise<number>
	{
		const res = await fetch('/api/user/reset', { method: "DELETE" });
		return res.status;
	}

	public async removeFromQueue(): Promise<number>
	{
		const res = await fetch("/api/chat/removeQueue", { 
			method: "DELETE",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: this.id
			})
		});
		return res.status;
	}
}
