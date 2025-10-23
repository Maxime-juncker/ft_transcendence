import { hashString } from './sha256.js'

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
	user.setUser(data.id, data.name, "", data.profile_picture);
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

	constructor()
	{
		this.m_id = -1;
		this.name = "";
		this.m_email = "";
		this.m_avatarPath = ""; // TODO: change with default img path
	}

	public async getUserFromId(id:string) : Promise<Response>
	{
		const params = { user_id: id };
		const queryString = new URLSearchParams(params).toString();
		var response = await fetch(`/api/get_profile_id?${queryString}`);

		return response;
	}

	public setUser(id:number, name:string, email:string, avatar: string)
	{
		this.m_id = id;
		this.name = name;
		this.m_email = email;
		this.m_avatarPath = avatar;
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
		// TODO: add/update status here

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
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				user_id: this.getId().toString(),
				friend_name: friend_name
			})
		});
		var data = await response.json();
		return response.status;
	}

	public getId() : number
	{
		return this.m_id;
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

export enum UserElementType
{
	MAIN = 0,
	STANDARD,
	FRIEND
}

export class UserElement
{
	private m_htmlAvatar:		HTMLImageElement;
	private m_htmlName:			HTMLElement;
	private m_htmlContainer:	HTMLElement;

	private m_htmlBtnContainer:	HTMLElement;
	private m_htmlLogoutBtn:	HTMLButtonElement;
	private m_htmlSettingsBtn:	HTMLButtonElement;
	private m_htmlFriendBtn:	HTMLButtonElement;

	constructor(user:User, parent:HTMLElement, type:UserElementType)
	{
		this.m_htmlContainer = document.createElement("div");
		this.m_htmlContainer.className = "user-container";

		this.m_htmlAvatar = document.createElement("img");
		this.m_htmlAvatar.className = "user-avatar";
		this.m_htmlAvatar.id = "user-avatar";

		this.m_htmlName = document.createElement("h3")

		this.m_htmlBtnContainer = document.createElement("div");
		this.m_htmlLogoutBtn = document.createElement("button");
		this.m_htmlLogoutBtn.innerText = "logout";
		this.m_htmlSettingsBtn = document.createElement("button");
		this.m_htmlSettingsBtn.innerText = "settings";
		this.m_htmlFriendBtn = document.createElement("button");
		this.m_htmlFriendBtn.innerText = "remove";

		this.m_htmlContainer.prepend(this.m_htmlBtnContainer);
		this.m_htmlContainer.prepend(this.m_htmlName);
		this.m_htmlContainer.prepend(this.m_htmlAvatar);

		parent.prepend(this.m_htmlContainer);

		this.setType(type);
		this.updateHtml(user);
	}

	public getLogoutBtn() :		HTMLButtonElement { return this.m_htmlLogoutBtn; }
	public getSettingsBtn() :	HTMLButtonElement { return this.m_htmlSettingsBtn; }
	public getFriendBtn() :		HTMLButtonElement { return this.m_htmlFriendBtn; }


	public setType(type: UserElementType)
	{
		switch (type) {
			case UserElementType.MAIN:
				this.m_htmlBtnContainer.prepend(this.m_htmlSettingsBtn);	
				this.m_htmlBtnContainer.prepend(this.m_htmlLogoutBtn);	
				break;
			case UserElementType.FRIEND:
				this.m_htmlBtnContainer.prepend(this.m_htmlFriendBtn);	
			default:
				break;
		}
	}

	public updateHtml(user:User) : void
	{
		if (!user)
		{
			this.m_htmlAvatar.src = ""; // TODO: add default avatar
			this.m_htmlName.innerText = "guest";
			return ;
		}

		this.m_htmlAvatar.src = user.getAvatarPath();
		this.m_htmlName.innerText = user.name;
	}
}

// TODO: handle user status (un)available / buzy / etc...
export class MainUser extends User
{
	private	m_htmlFriendContainer:		HTMLElement;

	private	m_userElement:				UserElement;
	private m_friendsElement:			Map<User, UserElement>;

	constructor(parent:HTMLElement, friendsContainer:HTMLElement)
	{
		super()
		this.m_htmlFriendContainer = friendsContainer;
		this.m_userElement = new UserElement(null, parent, UserElementType.MAIN);
		this.m_friendsElement = new Map<User, UserElement>();

		this.m_userElement.getLogoutBtn().addEventListener("click", (e) => this.logout());
	}

	public async login(email:string, passw:string) : Promise<{status: number, data:any }>
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
			})
		});
		const data = await response.json();

		if (response.status == 200)
		{
			this.setUser(data.id, data.name, data.email, data.profile_picture);
			this.m_userElement.updateHtml(this);
			this.updateFriendContainer();
		}

		return { status: response.status, data: data };
	}

	public logout()
	{
		this.setUser(-1, "", "", "");
		this.m_userElement.updateHtml(null);
		this.m_htmlFriendContainer.innerHTML = ""; // destroy all child
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

	public async updateFriendContainer()
	{
		this.m_htmlFriendContainer.innerHTML = ""; // destroy all child
		await this.updateSelf();
		var friends = this.getFriends();

		for (let i = 0; i < friends.length; i++)
		{
			const elt:UserElement = new UserElement(friends[i], this.m_htmlFriendContainer, UserElementType.FRIEND);
			this.m_friendsElement.set(friends[i], elt);
			elt.getFriendBtn().addEventListener('click', () => {
				this.removeFriends(friends[i]);
			})
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
}
