export class User
{
	private m_id:			number;

	private m_email:		string;
	private m_avatarPath:	string;

	public name:		string;

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
