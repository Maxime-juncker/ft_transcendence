import { setCookie, getCookie} from 'modules/utils/utils.js';
import { hashString } from 'modules/utils/sha256.js'
import { UserElement, UserElementType } from 'modules/user/UserElement.js';

export enum UserStatus {
	UNKNOW = -2,
	UNAVAILABLE = -1,
	AVAILABLE = 0,		// user online
	BUSY,				// overide IN_GAME / AVAILABLE
	IN_GAME,			// show when user in game
}

export enum AuthSource {
	DELETED = -3,	// deleted account
	BOT = -2,		// for bot account
	GUEST = -1,		// guest profile are deleted on logout
	INTERNAL = 0,
	GOOGLE,			// not used anymore
	GITHUB,
	FORTY_TWO
}

async function getUserInfoFromId(id: number): Promise<Response> {
	var response = await fetch(`/api/user/get_profile_id?user_id=${id.toString()}`);
	return response;
}

export async function getUserFromName(name: string): Promise<User | null> {
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

export async function getUserFromId(id: number): Promise<User | null> {
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
	public name: string = "";

	/* private vars */
	protected m_id: number = -1;
	protected m_token:		string = "";

	private m_email:		string	= "";
	private m_avatarPath:	string = "";
	private m_status:		UserStatus = UserStatus.UNKNOW;
	private m_created_at:	string = "";
	private m_stats:		Stats;
	private m_source:		AuthSource;

	private m_blockUsr:		User[];
	private m_friends:		User[] = []; // accepted request
	private m_pndgFriends = new Map<User, number>(); // pending requests (number == sender)

	private m_onStatusChanged: Array<(status: UserStatus) => void>;

	constructor(token?: string)
	{
		this.m_onStatusChanged = new Array<(status: UserStatus) => void>;
		this.setUser(
			-1,
			"Guest",
			"",
			"",
			UserStatus.UNKNOW
		);

		if (token) // token will be used for request needing permission
			this.m_token = token;
		this.m_blockUsr = [];
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
		this.m_blockUsr = [];
		this.m_pndgFriends = new Map<User, number>();
	}

	get status(): UserStatus			{ return this.m_status; }
	get email(): string				{ return this.m_email; }
	get avatarPath(): string			{ return this.m_avatarPath; }
	get	elo(): number						{ return this.m_stats.currElo; }
	get blockUsr(): User[]					{ return this.m_blockUsr; }
	get friends(): User[]					{ return this.m_friends; }
	get pndgFriends(): Map<User, number>	{ return this.m_pndgFriends; }
	get id(): number						{ return this.m_id; }
	get	created_at(): string				{ return this.m_created_at; }
	get gamePlayed(): number				{ return this.m_stats.gamePlayed; }
	get	stats(): Stats						{ return this.m_stats; }
	get	source(): AuthSource				{ return this.m_source; }
	get token(): string						{ return this.m_token; }
	set token(token: string)				{ this.m_token = token; }

	get winrate(): number
	{
		var winrate = 0;
		if (this.m_stats.gamePlayed > 0)
			winrate = this.m_stats.gameWon > 0 ? (this.m_stats.gameWon / this.m_stats.gamePlayed) * 100 : 0;
		return Math.round(winrate);
	}

	public onStatusChanged(cb: (status: UserStatus) => void)
	{
		this.m_onStatusChanged.push(cb);
	}

	public async setStatus(status: UserStatus): Promise<Response> {
		this.m_status = status;

		this.m_onStatusChanged.forEach(cb => cb(this.m_status));

		var response = await fetch("/api/user/set_status", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				token: this.m_token,
				new_status: this.m_status.toString()
			})
		});
		return response;
	}


	public async logoutDB() {
		const response = await fetch("/api/user/logout", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: this.m_token,
			})
		});
		this.setUser(-1, "Guest", "", "", UserStatus.UNKNOW);
		return response;
	}

	public async updateFriendList(): Promise<number>
	{
		this.m_friends = [];
		this.m_pndgFriends = new Map<User, number>();

		const params = { user_id: this.id.toString() };
		const queryString = new URLSearchParams(params).toString();
		var response = await fetch(`/api/friends/get?${queryString}`);
		var data = await response.json();

		for (let i = 0; i < data.length; i++) {
			const element = data[i];
			
			var id = element.user1_id == this.id ? element.user2_id : element.user1_id;
			const user = await getUserFromId(id);
			if (user == null)
			{
				console.warn("failed to get user");
				return -1;
			}
			if (data[i].pending)
				this.m_pndgFriends.set(user, data[i].sender_id);
			else
				this.m_friends.push(user);
		}
		return 0;
	}

	public async updateBlockList(): Promise<number>
	{
		if (!this.m_token)
			return 0;

		this.m_blockUsr = [];
		const response = await fetch('/api/user/blocked_users', { // TODO renvoyer tous les user ou blocked_by === id
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token: this.m_token })
		});
		if (response.status != 200)
			return response.status;

		const data = await response.json();

		for (let i = 0; i < data.length; i++)
		{
			if (data[i].blocked_by != this.id)
				continue ;
			const id = data[i].user1_id == this.id ? data[i].user2_id : data[i].user1_id;
			const tmp = await getUserFromId(id);
			if (!tmp)
			{
				console.error("failed to get user from following id:", id);
				return -1;
			}
			this.m_blockUsr.push(tmp);
		}

		return 0;
	}

	public async updateSelf(): Promise<number>
	{
		if (this.id == -1)
			return 1;

		var response = await getUserInfoFromId(this.id);
		if (response.status != 200)
			return response.status;

		var data = await response.json();
		this.name = data.name;
		this.m_avatarPath = data.avatar;
		this.m_status = data.is_login ? data.status : UserStatus.UNAVAILABLE;
		this.m_created_at = data.created_at;
		this.m_source = data.source;

		this.m_stats.gamePlayed = data.games_played;
		this.m_stats.gameWon = data.wins;
		this.m_stats.currElo = data.elo;

		await this.updateFriendList();
		await this.updateBlockList();

		return response.status;
	}

	protected async addFriendToDB(friendId: number): Promise<number> {
		var response = await fetch("/api/friends/send_request", {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: this.m_token,
				friend_id: friendId
			})
		});
		return response.status;
	}

	public async uploadAvatar(file: FormData): Promise<any>
	{
		file.append('token', this.m_token);

		var response = await fetch("/api/user/upload/avatar", {
			method: "POST",
			headers: { 'token': this.m_token },
			body: file
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
	option.setAttribute("data-i18n", optionName);
	return option;
}

export class MainUser extends User
{

	private m_userElement: UserElement | null = null;
	private m_onLoginCb:	Array<(user: MainUser) => void>;
	private m_onLogoutCb:	Array<(user: MainUser) => void>;

	constructor()
	{
		const token = getCookie("jwt_session");
		super(token);

		this.m_onLoginCb = [];
		this.m_onLogoutCb = [];
	}

	/**
	 * use to create a userElement
	 * @param parent html parent to append the child to
	*/
	public setHtml(parent: HTMLElement | null)
	{
		if (parent)
		{
			this.m_userElement = new UserElement(this, parent, UserElementType.MAIN);

			const statusSelect = this.m_userElement.getElement("#status") as HTMLSelectElement;
			statusSelect.prepend(newOption("available"));
			statusSelect.prepend(newOption("unavailable"));
			statusSelect.prepend(newOption("busy"));
			statusSelect.prepend(newOption("in_game"));
			statusSelect.addEventListener("change", () => this.updateStatus(statusSelect.value, this, this.m_userElement));
			switch (this.status)
			{
				case UserStatus.UNKNOW:
					statusSelect.value = "available";
					break;
				case UserStatus.UNAVAILABLE:
					statusSelect.value = "unavailable";
					break;
				case UserStatus.AVAILABLE:
					statusSelect.value = "available";
					break;
				case UserStatus.BUSY:
					statusSelect.value = "busy";
					break;
				case UserStatus.IN_GAME:
					statusSelect.value = "in_game";
					break;

			}
		}
	}
	
	public resetCallbacks()
	{
		this.m_onLoginCb = [];
		this.m_onLogoutCb = [];
	}

	public onLogin(cb: ((user: MainUser) => void)) { this.m_onLoginCb.push(cb); }
	public onLogout(cb: ((user: MainUser) => void)) { this.m_onLogoutCb.push(cb); }

	public async loginSession()
	{
		const response = await fetch("/api/user/get_session");
		const data = await response.json();

		if (response.status == 200)
		{
			var status = data.status;
			this.setUser(data.id, data.name, data.email, data.avatar, status);
			this.setStatus(this.status);
			await this.refreshSelf();

			this.m_onLoginCb.forEach(cb => cb(this));
		}
		else
			this.m_id = -1;
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
		// document.cookie = "jwt_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
		console.log("hello")
		setCookie("jwt_session", "", 0);
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

	private async updateStatus(newStatus: string, user: User, userHtml: UserElement | null)
	{
		if (!userHtml) return;

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

	public async setAvatar(file: FormData): Promise<number>
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

	public async removeFriend(user: User): Promise<number> {
		console.log("removing friend")
		const response = await fetch('/api/friends/remove', {
			method: "DELETE",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: this.m_token,
				friend_id: user.id
			})
		});

		await this.updateSelf();

		return response.status;
	}

	public async acceptFriend(user: User): Promise<number> {
		console.log("accepting friend")
		const response = await fetch('/api/friends/accept', {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: this.m_token,
				friend_id: user.id
			})
		});

		await this.updateSelf();

		return response.status;
	}


	public async addFriend(friend_name: string): Promise<number> {
		console.log("adding friend")
		if (!friend_name || friend_name == "")
			return 1;
		if (this.id == -1)
			return 2;

		const res = await fetch(`/api/user/get_profile_name?profile_name=${friend_name}`)
		if (res.status != 200)
			return res.status;

		const json = await res.json();
		const status = await this.addFriendToDB(json.id);
		await this.updateSelf();

		return status;
	}

	public async newTotp() : Promise<{status: number, data: any} | null>
	{
		if (this.id == -1)
			return null;

		var response = await fetch("/api/totp/reset", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: this.m_token,
				email: this.email,
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
				token: this.m_token
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
				token: this.m_token,
				totp: totp,
			})
			
		});

		return response.status;
	}

	public async deleteUser(): Promise<number>
	{
		const res = await fetch ('api/user/delete', {
			method: "DELETE",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				token: this.m_token
			})
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
				token: this.m_token
			})
		});
		return res.status;
	}

	public async blockUser(id: number): Promise<number>
	{
		const res = await fetch('/api/user/block', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ 
				token: this.m_token,
				id: id
			})
		});
		console.log("blocking");
		return res.status;
	}

	public async unblockUser(id: number): Promise<number>
	{
		console.log("unblocking");
		const res = await fetch('/api/user/unblock', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ 
				token: this.m_token,
				id: id
			})
		});
		await this.updateSelf();
		return res.status;
	}
}
