import { ViewComponent } from "modules/router/ViewComponent.js";
import { HeaderSmall } from "./HeaderSmall.js";
import { MainUser, User } from "modules/user/User.js";

export class DashboardView extends ViewComponent
{

	public async Init()
	{
		if (!MainUser.Instance)
			return;

		await MainUser.Instance.updateFriendList();
		await MainUser.Instance.updateBlockList();

		new HeaderSmall(MainUser.Instance, this, "header-container");
	}

	public async enable()
	{

	}

	public async disable()
	{

	}
}
