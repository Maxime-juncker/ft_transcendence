export class Utils
{
	protected HTMLelements: Map<string, HTMLElement> = new Map();

	constructor() {}

	protected show(className: string): void
	{
		this.HTMLelements.get(className)!.style.display = ('flex'); // changed remove class hidden to display flex
	}

	protected hide(className: string): void
	{
		this.HTMLelements.get(className)!.style.display = ('none');
	}

	protected setContent(className: string, content: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.textContent = content;
		if (show) this.show(className);
	}

	protected setColor(className: string, color: string, opacity: string = '1', show: boolean = false): void
	{
		this.HTMLelements.get(className)!.style.color = `rgba(${color}, ${opacity})`;
		if (show) this.show(className);
	}

	protected setHeight(className: string, height: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.style.height = height;
		if (show) this.show(className);
	}

	protected setWidth(className: string, width: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.style.width = width;
		if (show) this.show(className);
	}

	protected setLeft(className: string, left: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.style.left = left;
		if (show) this.show(className);
	}

	protected setRight(className: string, right: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.style.right = right;
		if (show) this.show(className);
	}

	protected setTop(className: string, top: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.style.top = top;
		if (show) this.show(className);
	}

	protected setBottom(className: string, bottom: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.style.bottom = bottom;
		if (show) this.show(className);
	}

	protected setInnerHTML(className: string, html: string, show: boolean = false): void
	{
		this.HTMLelements.get(className)!.innerHTML = html;
		if (show) this.show(className);
	}
}
