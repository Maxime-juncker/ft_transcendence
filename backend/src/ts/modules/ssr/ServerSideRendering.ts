import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';

export class ServerSideRendering
{
	private server: FastifyInstance;

	private readonly htmlhead = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
    <link rel="icon" type="image/x-icon" href="/public/favicon.ico">
	<title>FT_transcendence</title>
	<link href="/public/dist/global.css" rel="stylesheet">
	<link href="/public/test.css" rel="stylesheet">
	<link href="/public/dist/login.css" rel="stylesheet">
	<link href="/public/dist/profile.css" rel="stylesheet">
	<link href="/public/dist/start.css" rel="stylesheet">
	<script src="https://cdn.tailwindcss.com"></script>
	<link href="/public/dist/output.css" rel="stylesheet">
	</head>
	<body class="h-screen">
	`

	private readonly htmlFooter = `
		<!-- must be here for crt effect -->
		<div class="bootup-mask"></div>
		<div class="bootup-lines"></div>
		<h1 class="bootup-text">HDMI-1</h1>
		<div class="crt h-screen">
			<div class="crt-mask"></div> 
			<div id="app" class="h-full">

			</div>
			<div class="scanline">
				<div class="scan"></div>
			</div>
		</div>
		<script>var exports = {};</script>
		<script type="module" src="dist/app.js"></script>
	</body>
</html>
`

	private readonly pagePath: string = "/var/www/server/public";
	private m_spaPage: string = ""; // final spa to be sent to clients
	
	constructor(server: FastifyInstance, routes: string[])
	{
		this.server = server;
		this.setupRoutes();
		this.constructSPA(routes);
	}

	/**
	 * build a spa based html file in routes
	 * @param {string[]} routes all files to load
	 */
	private constructSPA(routes: string[])
	{
		this.m_spaPage = this.htmlhead;

		routes.forEach((route: string) => {
			const filepath = this.pagePath + route;
			const data = readFileSync(filepath, { encoding: 'utf-8', flag: 'r'});
			this.m_spaPage += data;
		})
		this.m_spaPage += this.htmlFooter;

		console.log("assembled spa:\n", this.m_spaPage);
	}

	private setupRoutes(): void
	{
		this.server.get('*', (request, reply) => // WARNING: this need to be the last route registered (or after all api routes)
		{
			if (request.url.startsWith("/api/")) // to api route where found previously
			{
				return reply.code(404).send({ message: 'route not found' });
			}
			console.log("sending page");
			reply.type('text/html').send(this.m_spaPage);
		});

	}

}
