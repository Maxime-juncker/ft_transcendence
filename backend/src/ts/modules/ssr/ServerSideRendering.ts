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
		<template id="tournament-item-template">
			<div class="flex justify-between items-center bg-darker p-3 rounded border border-gray-700 hover:border-blue-500 transition-colors">
				<div class="flex flex-col">
					<span class="tournament-owner-name font-bold text-white text-lg"></span>
					<span class="tournament-info text-sm text-gray-400 capitalize"></span>
				</div>
				<button class="join-btn btn bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-4 text-sm"></button>
			</div>
		</template>
		<template id="tournament-player-template">
			<div class="text-white bg-dark p-2 rounded">
				<span class="player-name"></span>
			</div>
		</template>
		<template id="tournament-request-template">
			<div class="flex justify-between items-center text-white bg-dark p-2 rounded">
				<span class="request-name"></span>
				<div class="flex gap-2">
					<button class="accept-btn btn-small bg-green-600 text-xs px-2 py-1 rounded">✓</button>
					<button class="reject-btn btn-small bg-red-600 text-xs px-2 py-1 rounded">✗</button>
				</div>
			</div>
		</template>
		<template id="tournament-match-template">
			<div class="match-box bg-gray-800 border-2 border-gray-600 p-3 w-48 text-center flex flex-col gap-2 shadow-lg relative z-10 rounded-none">
				<div class="player1-container border-b border-gray-700 pb-1 flex justify-between items-center gap-2">
					<span class="player1-name text-left truncate text-sm max-w-[70%]"></span>
					<span class="player1-score font-mono text-sm"></span>
				</div>
				<div class="player2-container flex justify-between items-center gap-2">
					<span class="player2-name text-left truncate text-sm max-w-[70%]"></span>
					<span class="player2-score font-mono text-sm"></span>
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
			<div id="app" class="h-full">

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
		Logger.log("spa ready");
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
			Logger.log("sending page");
			reply.type('text/html').send(this.m_spaPage);
		});

	}

}
