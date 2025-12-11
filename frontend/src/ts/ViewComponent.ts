type TrackListener = {
	element:	HTMLElement,
	event:		string,
	handler:	EventListener
};

export class ViewComponent extends HTMLElement
{
	private m_listeners: TrackListener[] = [];

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

	public addTrackListener(element: HTMLElement, event: string, handler: EventListener)
	{
		element.addEventListener(event, handler);
		this.m_listeners.push({ element: element, event: event, handler: handler });
	}

	public clearTrackListener()
	{
		this.m_listeners.forEach((listener: TrackListener) => {
			listener.element.removeEventListener(listener.event, listener.handler);
		});
		this.m_listeners.length = 0;
	}

	public async enable()
	{
		console.warn("this component as no logic attached")
	}

	public async disable()
	{

	}
}

