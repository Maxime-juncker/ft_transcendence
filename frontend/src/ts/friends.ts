import { UserElement, UserElementType } from 'UserElement.js';
import { User, MainUser } from 'User.js';
import { Router } from 'app.js'

export class FriendManager
{
	private m_pndgContainer:	HTMLElement;
	private m_friendsContainer:	HTMLElement;
	private m_friends:			UserElement[];
	private m_pndg:				UserElement[];
	private m_user:				User;
	private m_main:				MainUser;
	private m_template:			string;

	constructor(user: User, pndgContainer: string, friendContainer: string, main: MainUser = null, templateName: string = "user-friend-template")
	{
		this.m_user = user;
		this.m_main = main;
		this.m_pndgContainer = Router.getElementById(pndgContainer);
		this.m_friendsContainer = Router.getElementById(friendContainer);
		this.m_friends = [];
		this.m_pndg = [];
		this.m_template = templateName;

		this.refreshContainers();
	}

	public refreshContainers()
	{
		this.m_pndgContainer.innerHTML = "";
		this.m_friendsContainer.innerHTML = "";

		const pdng: UserElement[] = this.addFriends(this.m_pndgContainer, UserElementType.FRIEND_PNDG);
		const friends: UserElement[] = this.addFriends(this.m_friendsContainer, UserElementType.FRIEND);
		
		if (this.m_main.id != this.m_user.id)
		{
			if (Router.getElementById("request-title"))
				Router.getElementById("request-title").style.display = "none";
			this.m_pndgContainer.style.display = "none";
			return ;
		}
		else
		{
			if (Router.getElementById("request-title"))
				Router.getElementById("request-title").style.display = "flex";
			this.m_pndgContainer.style.display = "flex";
		}

		pdng.forEach(elt => {
			if (elt.type !== UserElementType.REQUEST)
				elt.getElement("#green-btn").style.display = "flex";

			elt.getElement("#red-btn").style.display = "flex";
			elt.getElement("#green-btn").addEventListener("click", async () => {
				await this.m_main.acceptFriend(elt.user)
				this.refreshContainers();
			});
			elt.getElement("#red-btn").addEventListener("click", async () => {
				await this.m_main.removeFriend(elt.user)
				this.refreshContainers();
			});
		})

		friends.forEach(elt => {
			elt.getElement("#red-btn").style.display = "flex";
			elt.getElement("#red-btn").innerText = "remove";
			elt.getElement("#red-btn").addEventListener("click", async () => {
				await this.m_main.removeFriend(elt.user)
				this.refreshContainers();
			});
		})
	}

	public addFriendsPndg(container: HTMLElement, type: UserElementType): UserElement[]
	{
		const	pndg: Map<User, number> = this.m_user.pndgFriends;
		console.log(pndg)
		var		htmlUser = [];

		pndg.forEach((sender: number, friend: User) => {
			var elt: UserElement;
			if (sender != this.m_user.id)
				elt = new UserElement(friend, container, type, this.m_template);
			else
				elt = new UserElement(friend, container, UserElementType.REQUEST, this.m_template);

			elt.updateHtml(friend);
			elt.getElement("#profile").addEventListener("click", () => { Router.Instance.navigateTo(`/profile?username=${friend.name}`) });
			elt.getElement("#green-btn").style.display = "none";
			elt.getElement("#red-btn").style.display = "none";
			htmlUser.push(elt);
		});
		return htmlUser;
	}

	public addFriends(container: HTMLElement, type: UserElementType): UserElement[]
	{
		if (type == UserElementType.FRIEND_PNDG)
			return this.addFriendsPndg(container, type);

		const	elt: User[] = this.m_user.friends;
		var		htmlUser = [];

		elt.forEach(friend => {
			const userElt = new UserElement(friend, container, type, this.m_template);

			userElt.getElement("#profile").addEventListener("click", () => { Router.Instance.navigateTo(`/profile?username=${friend.name}`) });
			userElt.updateHtml(friend);
			userElt.getElement("#green-btn").style.display = "none";
			userElt.getElement("#red-btn").style.display = "none";
			htmlUser.push(userElt);
		});
		return htmlUser;
	}
}
