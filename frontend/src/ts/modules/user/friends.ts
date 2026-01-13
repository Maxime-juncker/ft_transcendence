import { UserElement, UserElementType } from 'modules/user/UserElement.js';
import { User, MainUser } from 'modules/user/User.js';
import { Router } from 'modules/router/Router.js'

export class FriendManager
{
	private m_pndgContainer:	HTMLElement | null;
	private m_friendsContainer:	HTMLElement | null;
	private m_blockContainer:	HTMLElement | null;
	private m_user:				User;
	private m_main:				MainUser;
	private m_template:			string;

	constructor(user: User, pndgContainer: string, friendContainer: string, blockContainer: string, main: MainUser, templateName: string = "user-friend-template")
	{
		this.m_user = user;
		this.m_main = main;
		this.m_pndgContainer = Router.getElementById(pndgContainer);
		this.m_friendsContainer = Router.getElementById(friendContainer);
		this.m_blockContainer = Router.getElementById(blockContainer);
		this.m_template = templateName;

		this.refreshContainers();
	}

	public refreshContainers()
	{
		if (!this.m_friendsContainer || !this.m_pndgContainer || !this.m_blockContainer || !this.m_user)
			return ;

		this.m_pndgContainer.innerHTML = "";
		this.m_friendsContainer.innerHTML = "";
		this.m_blockContainer.innerHTML = "";

		const pdng: UserElement[] = this.addFriends(this.m_pndgContainer, UserElementType.FRIEND_PNDG);
		const friends: UserElement[] = this.addFriends(this.m_friendsContainer, UserElementType.FRIEND);
		
		if (this.m_main.id != this.m_user.id)
		{
			if (this.m_pndgContainer.parentElement)
				this.m_pndgContainer.parentElement.style.display = "none";
			if (this.m_blockContainer.parentElement)
				this.m_blockContainer.parentElement.style.display = "none";
			return ;
		}
		else
		{
			if (this.m_blockContainer.parentElement)
				this.m_blockContainer.parentElement.style.display = "block";
			if (this.m_pndgContainer.parentElement)
				this.m_pndgContainer.parentElement.style.display = "block";
		}

		this.m_user.blockUsr.forEach((block: User) => {
			if (!this.m_blockContainer)
				return ;

			const elt = new UserElement(block, this.m_blockContainer, UserElementType.STANDARD, this.m_template);
			// elt.getElement("#profile")?.addEventListener("click", () => { Router.Instance?.navigateTo(`/profile?username=${block.name}`) });
			elt.updateHtml(block);

			const redBtn = elt.getElement("#red-btn");
			const greenBtn = elt.getElement("#green-btn");
			if (!redBtn || !greenBtn)
			{
				console.warn("no redBtn or greenBtn");
				return ;
			}

			greenBtn.style.display = "none";
			redBtn.innerText = "X";
			redBtn.addEventListener("click", async () => {
				if (!elt.user) return;
				await this.m_main.unblockUser(elt.user.id);
				this.refreshContainers();
			});

		})

		pdng.forEach(elt => {
			const redBtn = elt.getElement("#red-btn");
			const greenBtn = elt.getElement("#green-btn");
			if (!redBtn || !greenBtn)
			{
				console.warn("no redBtn or greenBtn");
				return ;
			}

			if (elt.type !== UserElementType.REQUEST)
				greenBtn.style.display = "block";
			else
				redBtn.innerText = "X";

			redBtn.style.display = "block";
			greenBtn.addEventListener("click", async () => {
				if (!elt.user) return;
				await this.m_main.acceptFriend(elt.user)
				this.refreshContainers();
			});
			redBtn.addEventListener("click", async () => {
				if (!elt.user) return;
				await this.m_main.removeFriend(elt.user)
				this.refreshContainers();
			});
		})

		friends.forEach(elt => {
			const redBtn = elt.getElement("#red-btn");
			if (!redBtn)
				return ;

			redBtn.style.display = "flex";
			redBtn.innerText = "remove";
			redBtn.addEventListener("click", async () => {
				if (!elt.user) return;
				await this.m_main.removeFriend(elt.user)
				this.refreshContainers();
			});
		})
	}

	public addFriendsPndg(container: HTMLElement, type: UserElementType): UserElement[]
	{
		const	pndg: Map<User, number> = this.m_user.pndgFriends;
		var		htmlUser: UserElement[] = [];

		pndg.forEach((sender: number, friend: User) => {
			var elt: UserElement;
			if (sender != this.m_user.id)
				elt = new UserElement(friend, container, type, this.m_template);
			else
				elt = new UserElement(friend, container, UserElementType.REQUEST, this.m_template);

			elt.updateHtml(friend);
			const redBtn = elt.getElement("#red-btn");
			const greenBtn = elt.getElement("#green-btn");
			if (!redBtn || !greenBtn)
				return ;
			// elt.getElement("#profile")?.addEventListener("click", () => { Router.Instance?.navigateTo(`/profile?username=${friend.name}`) });
			redBtn.style.display = "none";
			greenBtn.style.display = "none";
			htmlUser.push(elt);
		});
		return htmlUser;
	}

	public addFriends(container: HTMLElement, type: UserElementType): UserElement[]
	{
		if (type == UserElementType.FRIEND_PNDG)
			return this.addFriendsPndg(container, type);

		const	friends: User[] = this.m_user.friends;
		var		htmlUser: UserElement[] = [];

		friends.forEach(friend => {
			const elt = new UserElement(friend, container, type, this.m_template);

			// elt.getElement("#profile")?.addEventListener("click", () => { Router.Instance?.navigateTo(`/profile?username=${friend.name}`) });
			elt.updateHtml(friend);
			const redBtn = elt.getElement("#red-btn");
			const greenBtn = elt.getElement("#green-btn");
			if (!redBtn || !greenBtn)
				return ;
			redBtn.style.display = "none";
			greenBtn.style.display = "none";
			htmlUser.push(elt);
		});
		return htmlUser;
	}
}
