type TrackListener = {
	element:	HTMLElement,
	event:		string,
	handler:	EventListener
};

export class ViewComponent extends HTMLElement
{
	protected m_listeners:	TrackListener[] = [];
	protected m_routePath:	string = "";

	public get routePath(): string { return this.m_routePath; }
	public set routePath(path: string) { this.m_routePath = path; }

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

	public addTrackListener(element: HTMLElement | null, event: string, handler: EventListener)
	{
		if (!element)
		{
			console.error("element is null");
			return ;
		}
		element.addEventListener(event, handler);
		this.m_listeners.push({ element: element, event: event, handler: handler });
	}

	public removeTrackListener(element: HTMLElement, event: string, handler: EventListener)
	{
		for (let i = 0; i < this.m_listeners.length; i++)
		{
			const listener: TrackListener = this.m_listeners[i];
			if (listener.element === element && listener.event === event && listener.handler === handler)
			{
				listener.element.removeEventListener(listener.event, listener.handler);
				this.m_listeners.splice(i, 1);
				return ;
			}
		}
	}

	public clearTrackListener()
	{
		this.m_listeners.forEach((listener: TrackListener) => {
			listener.element.removeEventListener(listener.event, listener.handler);
		});
		this.m_listeners = [];
	}

	public async enable()
	{
		console.warn("this component as no logic attached")
	}

	public async disable()
	{

	}
}

