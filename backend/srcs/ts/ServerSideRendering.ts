import { FastifyInstance } from 'fastify';

export class ServerSideRendering
{
	private server: FastifyInstance;

	private static readonly HTML_HEADER = `
		<!DOCTYPE html>

		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="X-UA-Compatible" content="IE=edge">

				<title>ft_transcendence</title>
				<link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
				<link rel="preconnect" href="https://fonts.googleapis.com">
				<link rel="preconnected" href="https://fonts.gstatic.com" crossorigin>
				<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
				<link rel="stylesheet" href="/css/output.css">
			</head>

			<body>
	`;

	private static readonly HTML_FOOTER = `
				<script>var exports = {};</script>
				<script type="module" src="dist/router.js"></script>
			</body>
		</html>
	`;

	private static readonly HTML_HOMEPAGE = `
				<section class="home">
					<h1>PONG</h1>
					<button id="1player"></button>
					<button id="2player"></button>
				</section>
	`;

	private static readonly HTML_GAMEPAGE = `
				<section class="game">
					<div class="paddle-left"></div>
					<div class="paddle-right"></div>
					<div class="net"></div>
					<div class="ball"></div>
					<p class="score-left"></p>
					<p class="score-right"></p>
					<p class="countdown"></p>
					<p class="pause-msg"></p>
					<p class="continue-msg"></p>
					<p class="winner-msg"></p>
					<p class="play-again-msg"></p>
					<p class="player1"></p>
					<p class="player2"></p>
					<p class="searching-msg"></p>
				</section>
	`;

	constructor(server: FastifyInstance)
	{
		this.server = server;
		this.setupRoutes();
	}

	private setupRoutes(): void
	{
		this.server.get('*', (request, reply) =>
		{
			reply.type('text/html').send(this.getPage());
		});
	}

	private getPage(): string
	{
		return (ServerSideRendering.HTML_HEADER + ServerSideRendering.HTML_HOMEPAGE + ServerSideRendering.HTML_GAMEPAGE + ServerSideRendering.HTML_FOOTER);
	}
}
