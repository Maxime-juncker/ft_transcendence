import { hashString } from './sha256.js'
import { UserElement, UserElementType } from './UserElement.js';

// *********************** TODO *********************** //
// Add settings page									//
// view user profile									//
// match history										//
// stats (win loses, winrate, etc)						//
// default avatar										//
// **************************************************** //

export enum UserStatus {
	UNKNOW = -2,
	UNAVAILABLE = -1,
	AVAILABLE = 0,			// user online
	BUSY,				// overide IN_GAME / AVAILABLE
	INVISIBLE,			// overide IN_GAME / AVAILABLE same ui as unavailable
	IN_GAME,			// show when user in game
}

async function getUserInfoFromId(id: string): Promise<Response> {
	const params = { user_id: id };
	const queryString = new URLSearchParams(params).toString();
	var response = await fetch(`/api/user/get_profile_id?${queryString}`);
	
	return response;
}

async function getUserFromId(id: string): Promise<User> {
	const response = await getUserInfoFromId(id);
	if (response.status != 200)
		return null

	const data = await response.json();
	var user = new User();
	var status = data.is_login ? data.status : UserStatus.UNAVAILABLE;
	user.setUser(data.id, data.name, "", data.avatar, status);
	return user;
}

export class User {
	/* public vars */
	public name: string;

	/* private vars */
	private m_id: number;

	private m_email: string;
	private m_avatarPath: string;

	private m_friends: User[]; // accepted request
	private m_pndgFriends: User[]; // pending requests
	private m_status: UserStatus;

	constructor() {
		this.setUser(
			-1,
			"Guest",
			"",
			"", // TODO: add default avatar
			UserStatus.UNKNOW
		);
	}

	public setUser(id: number, name: string, email: string, avatar: string, status: UserStatus) {
		this.m_id = id;
		this.name = name;
		this.m_email = email;
		this.m_avatarPath = avatar;
		this.m_status = status;
		this.m_friends = [];
		this.m_pndgFriends = [];
	}

	public getStatus(): UserStatus { return this.m_status; }
	public getFriends(): User[] { return this.m_friends; }
	public getPndgFriends(): User[] { return this.m_pndgFriends; }
	public getId(): number { return this.m_id; }
	public getEmail(): string { return this.m_email; }
	// public getAvatarPath() : string { return this.m_avatarPath + "?" + new Date().getTime(); }
	public getAvatarPath(): string { return this.m_avatarPath; }

	public async setStatus(status: UserStatus): Promise<Response> {
		this.m_status = status;
		console.log(`settings status to: ${status}`);

		var response = await fetch("/api/user/set_status", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				user_id: this.getId().toString(),
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
				user_id: this.getId().toString(),
			})
		});
		this.setUser(-1, "Guest", "", "", UserStatus.UNKNOW);
		return response;
	}

	public async updateFriendList(): Promise<number> {
		this.m_friends = [];
		this.m_pndgFriends = [];

		const params = { user_id: this.getId().toString() };
		const queryString = new URLSearchParams(params).toString();
		var response = await fetch(`/api/friends/get?${queryString}`);
		var data = await response.json();

		for (let i = 0; i < data.length; i++) {
			const element = data[i];

			var id = element.user1_id == this.getId() ? element.user2_id : element.user1_id;
			if (data[i].pending)
				this.m_pndgFriends.push(await getUserFromId(id));
			else
				this.m_friends.push(await getUserFromId(id));
		}
		return 0;
	}

	public async updateSelf(): Promise<number> {
		if (this.getId() == -1)
			return 1;

		var response = await getUserInfoFromId(this.getId().toString());
		if (response.status != 200)
			return response.status;

		var data = await response.json();
		this.name = data.name;
		this.m_avatarPath = data.avatar;
		this.m_status = data.status;
		await this.updateFriendList();

		return response.status;
	}

	protected async addFriendToDB(friend_name: string): Promise<number> {
		var response = await fetch("/api/friends/send_request", {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.getId().toString(),
				friend_name: friend_name
			})
		});
		return response.status;
	}

	public async uploadAvatar(file: File): Promise<any> {
		const formData = new FormData();
		if (!file)
			return;

		formData.append("file", file, file.name);

		var response = await fetch("/api/user/upload/avatar", {
			method: "POST",
			headers: {
				'id': this.m_id.toString(),
				'email': this.m_email,
				'prev_avatar': this.m_avatarPath,
			},
			body: formData,

		});
		var data = await response.json();
		this.m_avatarPath = "/api/images/" + data.filename;

		return response;
	}
}


export class MainUser extends User {
	private m_htmlFriendContainer: HTMLElement;
	private m_htmlPndgFriendContainer: HTMLElement;

	private m_userElement: UserElement;
	private m_friendsElements: UserElement[];
	private m_pndgFriendsElements: UserElement[];

	private m_onLoginCb:	Array<(user: MainUser) => void>;
	private m_onLogoutCb:	Array<(user: MainUser) => void>;

	constructor(parent: HTMLElement, friendsContainer: HTMLElement, pndgFriendsContainer: HTMLElement) {
		super()
		this.m_htmlFriendContainer = friendsContainer;
		this.m_htmlPndgFriendContainer = pndgFriendsContainer;
		this.m_userElement = new UserElement(null, parent, UserElementType.MAIN);
		this.m_friendsElements = [];
		this.m_pndgFriendsElements = [];

		this.m_userElement.getBtn2().addEventListener("click", () => this.logout());
		this.m_userElement.getStatusSelect().addEventListener("change", () => this.updateStatus(this.m_userElement.getStatusSelect().value, this, this.m_userElement));

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
		console.log(response.status, data);

		if (response.status == 200) {
			var status = data.status;
			this.setUser(data.id, data.name, data.email, data.avatar, status);
			this.setStatus(this.getStatus());
			await this.refreshSelf();

			this.m_onLoginCb.forEach(cb => cb(this));
		}
	}

	public async login(email: string, passw: string, totp: string): Promise<{ status: number, data: any }> {
		if (this.getId() != -1)
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
		this.m_userElement.updateHtml(null);
		if (this.m_htmlFriendContainer)
			this.m_htmlFriendContainer.innerHTML = ""; // destroy all child
		this.m_friendsElements = [];

		this.m_onLogoutCb.forEach(cb => cb(this));
	}

	public async refreshSelf()
	{
		if (this.getId() == -1)
			return;
		await this.updateSelf();
		await this.updateFriendContainer();
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

	public async setAvatar(file: File): Promise<number> // TODO: check si multipart upload ok
	{
		if (this.getId() == -1)
			return 1;
		if (!file)
			return 2;

		await this.uploadAvatar(file);
		this.m_userElement.updateHtml(this);

		return 0;
	}

	public async removeFriend(user: User): Promise<Response> {
		const url = `/api/friends/remove/${this.getId()}/${user.getId()}`;
		const response = await fetch(url, { method: "DELETE" });

		await this.updateSelf();
		await this.updateFriendContainer();

		return response;
	}

	public async acceptFriend(user: User): Promise<Response> {
		const url = `/api/friends/accept/${this.getId()}/${user.getId()}`;
		const response = await fetch(url, { method: "POST" });

		await this.updateSelf();
		await this.updateFriendContainer();

		const data = await response.json();
		return response;
	}

	private rebuildFriendContainer(friends: User[], container: HTMLElement, elements: UserElement[], pending: boolean) {
		elements = [];
		container.innerHTML = ""; // destroy all child
		for (let i = 0; i < friends.length; i++) {
			const elt: UserElement = new UserElement(friends[i], container, pending ? UserElementType.FRIEND_PNDG : UserElementType.FRIEND);
			elements.push(elt);

			if (pending) {
				elt.getBtn1().addEventListener('click', () => { // to move in update
					this.acceptFriend(friends[i]);
				})
				elt.getBtn2().addEventListener('click', () => { // to move in update
					this.removeFriend(friends[i]);
				})
			}
			else {
				elt.getBtn1().addEventListener('click', () => { // to move in update
					this.removeFriend(friends[i]);
				})
			}
		}
		return elements;
	}

	public async updateFriendContainer() {
		await this.updateSelf();
		var friends = this.getFriends();
		var pndgFriends = this.getPndgFriends();

		if (friends.length != this.m_friendsElements.length)
			this.m_friendsElements = this.rebuildFriendContainer(friends, this.m_htmlFriendContainer, this.m_friendsElements, false);

		if (pndgFriends.length != this.m_pndgFriendsElements.length)
			this.m_pndgFriendsElements = this.rebuildFriendContainer(pndgFriends, this.m_htmlPndgFriendContainer, this.m_pndgFriendsElements, true);

		for (let i = 0; i < friends.length; i++)
			this.m_friendsElements[i].updateHtml(friends[i]);
		for (let i = 0; i < pndgFriends.length; i++)
			this.m_pndgFriendsElements[i].updateHtml(pndgFriends[i]);
	}

	public async addFriend(friend_name: string): Promise<number> {
		if (!friend_name || friend_name == "")
			return 1;
		if (this.getId() == -1)
			return 2;

		const status = await this.addFriendToDB(friend_name);
		await this.updateSelf();
		await this.updateFriendContainer();

		return status;
	}

	public async newTotp() : Promise<{status: number, data: any}>
	{
		if (this.getId() == -1)
			return null;

		var response = await fetch("/api/totp/reset", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.getId().toString(),
				email: this.getEmail(),
			})
			
		});
		var data = await response.json();
		return { status: response.status, data: data };
	}

	public async delTotp() : Promise<number>
	{
		if (this.getId() == -1)
			return 404;

		var response = await fetch("/api/totp/remove", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.getId().toString(),
			})
			
		});

		return response.status;
	}

	public async validateTotp(totp: string) : Promise<number>
	{
		if (this.getId() == -1)
			return 404;

		var response = await fetch("/api/totp/validate", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.getId().toString(),
				totp: totp,
			})
			
		});

		return response.status;
	}
}
