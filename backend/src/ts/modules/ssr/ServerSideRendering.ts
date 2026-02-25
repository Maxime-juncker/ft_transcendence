import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { Logger } from 'modules/logger.js';

export class ServerSideRendering
{
	private server: FastifyInstance;

	private readonly htmlhead = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
	<meta charset="UTF-8">
	<meta name="description" content="ft_trancendence is a pong game created for the 42 school project of the same name. It features online multiplayer, matchmaking, a lobby system, and more.">
	<meta name="keywords" content="game pong ft_trancendence 42">
	<meta name="author" content="Alexis Bidolet--Foray Maxime Juncker Simon Thomas Yves Gille">

	<meta property="og:title" content="ft_trancendence is a pong game created for the 42 school project of the same name. It features online multiplayer, matchmaking, a lobby system, and more.">
	<meta property="og:description" content="Pong.">
	<meta property="og:type" content="website">
	<meta property="og:image" content="/public/preview.png">

	<link rel="icon" type="image/x-icon" href="/public/favicon.ico">
	<title>FT_transcendence</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Saira+Semi+Condensed:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
	<link href="/public/output.css" rel="stylesheet">
	<link href="/public/output_crt.css" rel="stylesheet">
	</head>
	<body class="h-screen">
		<template id="header-small-template">
			<header class="header-small">
				<div id="banner" class="banner-small">
					<h1 class="select-none">FT_TRANSCENDENCE</h1>
					<div class="small-lines">
						<div class="line bg-red"></div>
						<div class="line bg-yellow"></div>
						<div class="line bg-blue"></div>
						<div class="line bg-green"></div>
					</div>
				</div>
				<input type="text" id="search-input" data-i18n-placeholder="search" placeholder="search" class="bg-darker border-purple w-full">
				<div id="user-container">
				</div>
			</header>
		</template>
		<template id="user-profile-template">
			<div class="user-menu relative">
				<select id="status"></select>
				<div id="user-menu-container" class="hide absolute top-[90%] size-fit z-2">
					<p id="profile_btn" data-i18n="profile" class="btn text-left cursor-default">profile</p>
					<p id="settings_btn" data-i18n="settings" class="btn text-left cursor-default">settings</p>
					<p id="about_btn" data-i18n="about" class="btn text-left cursor-default">about</p>
					<p id="logout_btn" data-i18n="logout" class="btn text-left cursor-default hover:bg-red">logout</p>
				</div>
				<div id="user-menu-btn" class="flex items-center gap-4 hover:text-green">
					<div id="avatar-name" class="text-[100%] font-bold select-none">
						user
					</div>
					<img
						id="avatar-img"
						src="" 
						alt="Profile" 
						class="avatar-img"/>
					<div id="user-status" class="user-status right-0 top-[60%]"></div>
				</div>
			</div>
		</template>
	`

	private readonly htmlFooter = `
		<!-- must be here for crt effect -->
		<div class="bootup-mask"></div>
		<div class="bootup-lines"></div>
		<h1 class="bootup-text">HDMI-1</h1>
		<div class="crt-mask"></div> 

		<div id="crt" class="crt h-screen">
			<div id="app" class="h-full [&::-webkit-scrollbar]:w-2
  [&::-webkit-scrollbar-track]:bg-gray-100
  [&::-webkit-scrollbar-thumb]:bg-gray-300
  dark:[&::-webkit-scrollbar-track]:bg-neutral-700
  dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">

			</div>
			<div class="scanline">
				<div class="scan"></div>
			</div>
		</div>
		<script type="importmap">
		{
			"imports": {
				"chart.js": "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm"
			}
		}
		</script>
		<script>var exports = {};</script>
		<script type="module" src="/dist/app.js"></script>
		<script type="module" src="/assets/translation.js"></script>
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
		Logger.success("spa ready");
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
	}

	private setupRoutes(): void
	{
		this.server.get('*', (request, reply) => // WARNING: this need to be the last route registered (or after all api routes)
		{
			if (request.url.startsWith("/api/")) // no api route where found previously
			{
				return reply.code(404).send({ message: 'route not found' });
			}
			reply.type('text/html').send(this.m_spaPage);
		});

	}

}
