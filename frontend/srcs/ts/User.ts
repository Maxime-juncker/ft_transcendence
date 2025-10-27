import { hashString } from './sha256.js'
import { UserElement, UserElementType } from './UserElement.js';

// *********************** TODO *********************** //
// Add settings page									//
// Add user status										//
// friends request										//
// view user profile									//
// match history										//
// stats (win loses, winrate, etc)						//
// default avatar										//
// unavailable not a status => to replace with is login //
// **************************************************** //

export enum UserStatus
{
	UNKNOW = -1,
	UNAVAILABLE = 0,
	AVAILABLE,			// user online
	BUSY,				// overide IN_GAME / AVAILABLE
	INVISIBLE,			// overide IN_GAME / AVAILABLE same ui as unavailable
	IN_GAME,			// show when user in game
}

async function getUserInfoFromId(id:string) : Promise<Response>
{
	const params = { user_id: id };
	const queryString = new URLSearchParams(params).toString();
	var response = await fetch(`/api/get_profile_id?${queryString}`);

	return response;
}

async function getUserFromId(id:string) : Promise<User>
{
	const response = await getUserInfoFromId(id);
	if (response.status != 200)
		return null
	
	const data = await response.json();
	var user = new User();
	var status = data.is_login ? data.status : UserStatus.UNAVAILABLE;
	user.setUser(data.id, data.name, "", data.profile_picture, status);
	return user;
}

export class User
{
	/* public vars */
	public name:			string;

	/* private vars */
	private m_id:			number;

	private m_email:		string;
	private m_avatarPath:	string;
	
	private m_friends:		User[];
	private m_status:		UserStatus;

	constructor()
	{
		this.m_id = -1;
		this.name = "";
		this.m_email = "";
		this.m_avatarPath = ""; // TODO: change with default img path
		this.m_status = UserStatus.UNKNOW;
	}

	public getStatus() : UserStatus { return this.m_status; }
	public async setStatus(status: UserStatus) : Promise<Response>
	{
		this.m_status = status;
		console.log(`settings status to: ${status}`);

		var response = await fetch("/api/set_status", {
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

	public async getUserFromId(id:string) : Promise<Response>
	{
		const params = { user_id: id };
		const queryString = new URLSearchParams(params).toString();
		var response = await fetch(`/api/get_profile_id?${queryString}`);

		return response;
	}

	public setUser(id:number, name:string, email:string, avatar: string, status: UserStatus)
	{
		this.m_id = id;
		this.name = name;
		this.m_email = email;
		this.m_avatarPath = avatar;
		this.m_status = status;
	}

	public async logoutDB()
	{
		const response = await fetch("/api/logout_user", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.getId().toString(),
			})
		});
		this.setUser(-1, "", "", "", UserStatus.UNKNOW);
		return response;
	}

	public async updateFriendList() : Promise<number>
	{
		this.m_friends = [];

		const params = { user_id: this.getId().toString() };
		const queryString = new URLSearchParams(params).toString();
		var response = await fetch(`/api/get_friends?${queryString}`);
		var data = await response.json();

		for (let i = 0; i < data.length; i++)
		{
			const element = data[i];

			var id = element.user1_id == this.getId() ? element.user2_id : element.user1_id;
			this.m_friends.push(await getUserFromId(id));
		}
		return 0;
	}

	public async updateSelf() : Promise<number>
	{
		if (this.getId() == -1)
			return 1;
		var response = await getUserInfoFromId(this.getId().toString());
		if (response.status != 200)
			return response.status;
		var data = await response.json();
		this.name = data.name;
		this.m_avatarPath = data.profile_picture;
		this.m_status = data.status;

		await this.updateFriendList();

		return response.status;
	}

	public getFriends() : User[]
	{
		return this.m_friends;
	}

	protected async addFriendToDB(friend_name: string) : Promise<number>
	{
		var response = await fetch("/api/add_friend", {
			method: "POST",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.getId().toString(),
				friend_name: friend_name
			})
		});
		return response.status;
	}

	public getId() : number
	{
		return this.m_id;
	}

	public getEmail() : string
	{
		return this.m_email;
	}

	public getAvatarPath() : string
	{
		return this.m_avatarPath + "?" + new Date().getTime();
	}

	public async uploadAvatar(file:File) : Promise<any>
	{
		const formData = new FormData();
		if (!file)
			return ;

		formData.append("file", file, file.name);

		var response = await fetch("/api/upload/avatar", {
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


// TODO: handle user status (un)available / buzy / etc...
export class MainUser extends User
{
	private	m_htmlFriendContainer:		HTMLElement;

	private	m_userElement:				UserElement;
	private m_friendsElement:			UserElement[];

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

	constructor(parent:HTMLElement, friendsContainer:HTMLElement)
	{
		super()
		this.m_htmlFriendContainer = friendsContainer;
		this.m_userElement = new UserElement(null, parent, UserElementType.MAIN);
		this.m_friendsElement = [];

		this.m_userElement.getLogoutBtn().addEventListener("click", () => this.logout());
		this.m_userElement.getStatusSelect().addEventListener("change", () => this.updateStatus(this.m_userElement.getStatusSelect().value, this, this.m_userElement));
	}

	public async refreshSelf()
	{
		if (this.getId() == -1)
			return ;
		await this.updateSelf();
		await this.updateFriendContainer();
		this.m_userElement.updateHtml(this);
	}

	public async login(email:string, passw:string, totp:string) : Promise<{status: number, data:any }>
	{
		if (this.getId() != -1)
			return { status: -1, data: null };

		const response = await fetch("/api/login", {
			method: "POST",
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				email: email,
				passw: hashString(passw),
				totp: totp
			})
		});
		const data = await response.json();

		if (response.status == 200)
		{
			var status = data.is_login ? data.status : UserStatus.UNAVAILABLE;
			this.setUser(data.id, data.name, data.email, data.profile_picture, status);
			this.setStatus(this.getStatus());
			await this.refreshSelf();
		}

		return { status: response.status, data: data };
	}

	public async logout()
	{
		await this.logoutDB();
		this.m_userElement.updateHtml(null);
		this.m_htmlFriendContainer.innerHTML = ""; // destroy all child
		this.m_friendsElement = [];
	}

	public async setAvatar(file: File) : Promise<number> // TODO: check si multipart upload ok
	{
		if (this.getId() == -1 || !file)
			return 1;

		await this.uploadAvatar(file);
		this.m_userElement.updateHtml(this);

		return 0;
	}

	public async removeFriends(user: User) : Promise<Response>
	{
		const url = `/api/remove_friend/${this.getId()}/${user.getId()}`;
		const response = await fetch(url, { method: "DELETE" });

		await this.updateSelf();
		await this.updateFriendContainer();

		return response;
	}

	private rebuildFriendContainer(friends:any)
	{
		this.m_friendsElement = [];
		this.m_htmlFriendContainer.innerHTML = ""; // destroy all child
		for (let i = 0; i < friends.length; i++)
		{
			const elt:UserElement = new UserElement(friends[i], this.m_htmlFriendContainer, UserElementType.FRIEND);
			this.m_friendsElement.push(elt);
			elt.getFriendBtn().addEventListener('click', () => {
				this.removeFriends(friends[i]);
			})
		}
	}

	public async updateFriendContainer()
	{
		await this.updateSelf();
		var friends = this.getFriends();

		if (friends.length != this.m_friendsElement.length)
			this.rebuildFriendContainer(friends);
		for (let i = 0; i < friends.length; i++)
		{
			this.m_friendsElement[i].updateHtml(friends[i]);
		}
	}

	public async addFriend(friend_name: string) : Promise<number>
	{
		if (!friend_name || friend_name == "")
			return 1;
		if (this.getId() == -1)
			return 2;

		const status = await this.addFriendToDB(friend_name);
		await this.updateSelf();
		await this.updateFriendContainer();

		return status;
	}

	public async newTotp() : Promise<string>
	{
		if (this.getId() == -1)
			return null;

		var response = await fetch("/api/totp/reset", {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				user_id: this.getId().toString(),
			})
			
		});
		var data = await response.json();

		var otpauth = "otpauth://totp/Transcendence:" + this.getEmail() + "?secret=" + data.seed + "&issuer=Transcendence";

		return otpauth;
	}
}
