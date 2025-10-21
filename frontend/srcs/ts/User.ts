export class User
{
	private m_id:			number;

	private m_email:		string;
	private m_avatarPath:	string;

	public name:			string;


	constructor(id:number, name:string, email:string, avatar: string)
	{
		this.m_id = id;
		this.name = name;
		this.m_email = email;
		this.m_avatarPath = avatar;
	}

	public getAvatarPath() : string
	{
		// console.log(this.m_avatarPath + "?" + new Date().getTime());
		return this.m_avatarPath + "?" + new Date().getTime();
	}

	public async setAvatar(file:File) : Promise<any>
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
		console.log(data);

		this.m_avatarPath = "/api/images/" + data.filename;

		return response;
	}

}

export class UserElement
{
	private	m_user:				User;

	private m_htmlAvatar:		HTMLImageElement;
	private m_htmlName:			HTMLElement;
	private m_htmlContainer:	HTMLElement;

	constructor(user:User, parent:HTMLElement)
	{
		this.m_user = user;

		this.m_htmlContainer = document.createElement("div");
		this.m_htmlContainer.className = "user-container";

		this.m_htmlAvatar = document.createElement("img");
		this.m_htmlAvatar.className = "user-avatar";
		this.m_htmlAvatar.id = "user-avatar";

		this.m_htmlName = document.createElement("h3")

		this.m_htmlContainer.prepend(this.m_htmlName);
		this.m_htmlContainer.prepend(this.m_htmlAvatar);

		parent.prepend(this.m_htmlContainer);

		this.updateHtml(user);
	}

	public updateHtml(user:User) : void
	{
		this.m_user = user;
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
