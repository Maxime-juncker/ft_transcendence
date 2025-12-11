export class ViewComponent extends HTMLElement
{
	constructor()
	{
		super();
	}

	connectedCallback()
	{
		const templateId = this.getAttribute('templateId') || '';
		const template = document.getElementById(templateId) as HTMLTemplateElement;
		const clone = template.content.cloneNode(true);
		this.innerHTML = "";
		this.append(clone);
	}

	public async enable()
	{
		console.warn("this component as no logic attached")
	}

	public async disable()
	{

	}
}

