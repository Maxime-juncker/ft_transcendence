use reqwest::{
	header::HeaderMap,
	Client,
};
use crossterm::event::{self, poll, Event, KeyCode, KeyModifiers};
use futures_util::{StreamExt, SinkExt};
use std::time::Duration;
use std::{
	collections::HashMap,
	error::Error,
};

use tokio_tungstenite::connect_async_tls_with_config;
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::Connector;
use tokio_tungstenite::tungstenite::protocol::Message;

use tokio_tungstenite::tungstenite::client::IntoClientRequest;

use std::thread::{sleep};

use anyhow::{Result, anyhow};
use crate::Infos;
use tokio::net::TcpStream;
struct Game {
	location: String,
	id: u64,
	client: Client,
	game_id: String,
	opponent_id: u64,
	player_id: u64,
}

// struct Infos {
//   original_size: (u16, u16),
//   location: String,
//   id: u64,
//   client: Client,
// }

//  Response: Object {"gameId": String("442c772e-0ec8-447e-8f1d-b87f00c76380"), 
//"opponentId": String("35"), 
//"playerId": Number(2)}


// enum Params
// {
// 	PADDLE_HEIGHT = 15,
// 	PADDLE_WIDTH = 2,
// 	PADDLE_PADDING = 2,
// 	BALL_SIZE = 2,
// 	BACKGROUND_OPACITY = 0.4,
// 	COLOR = (255, 255, 255),
// 	COUNTDOWN_START = 3,
// 	IPS = 60,
// }

// enum Keys
// {
// 	PLAY_AGAIN: KeyCode = KeyCode::Enter,
// 	DEFAULT_UP: KeyCode = KeyCode::Up,
// 	DEFAULT_DOWN: KeyCode = KeyCode::Down,
// 	PLAYER1_UP: KeyCode = KeyCode::Char('w'),
// 	PLAYER1_DOWN: KeyCode = KeyCode::Char('s'),
// 	PLAYER2_UP: KeyCode = KeyCode::Up,
// 	PLAYER2_DOWN: KeyCode = KeyCode::Down,
// }

// enum Msgs
// {
// 	SEARCHING = "Searching for opponent...",
// 	WIN = "wins !",
// 	PLAY_AGAIN = "Press ${Keys.PLAY_AGAIN} to play again",
// }

pub async fn create_game<'a>(game_main: &Infos, mode: &str) -> Result<(), Box<dyn Error>> {
	let mut map = HashMap::new();
	let mut headers = HeaderMap::new();
	headers.insert("Content-Type", "application/json".parse()?);
    map.insert("mode", mode);
	let id: &str = &game_main.id.to_string();
	map.insert("playerName", id);
	let mut url = game_main.location.clone();
    url = format!("https://{url}/api/create-game");
    let response = game_main.client.post(url)
        .headers(headers)
        .json(&map)
        .send()
        .await
		.unwrap();

	let response: serde_json::Value = response
        .json()
        .await
		.unwrap();

    println!("Response: {:?}", response);
	let game = match Game::new(game_main, response) {
		Ok(game) => game,
		Err(e) => {
			eprintln!("EEEEEEEEE: {:?}", e);
			std::process::exit(1);
		},
	};
	game.start_game().await?;
	Ok(())
}

impl Game {
	fn new(info: &Infos, value: serde_json::Value) -> Result<Game> {
		let game_id: String = match value["gameId"].as_str() {
			Some(id) => id.to_string(),
			None => return Err(anyhow::anyhow!("No game Id in response")),
		};
		let opponent_id = match value["opponentId"].as_u64() {
			Some(id) => id,
			None => return Err(anyhow::anyhow!("No opponent id in response")),
		};
		let player_id: u64 = match value["playerId"].as_u64() {
			Some(nbr) => nbr,
			None => return Err(anyhow::anyhow!("No player Id in response")),
		};
		Ok(Game{location: info.location.clone(), id: info.id, client: info.client.clone(), game_id, opponent_id, player_id})
	}
	// async fn launch_countdown(&self) -> Result<()> {
	// 	//3...2....1....0 -->
	// 	//Affiche le compte a rebours puis a 0 START GAME
	// 	self.start_game().await?;
	// 	Ok(())
	// }
	async fn start_game(&self) -> Result<()> {
		// let location = self.location;
		let url = format!("https://{}/api/start-game/{}", self.location, self.game_id);
		
		let toprint = self.client.post(url).send().await.unwrap();
		eprintln!("POST RESPONSE  {:?}", toprint);
		let body = toprint.text().await.unwrap();
		eprintln!("Body: {}", body);
		let request = format!("wss://{}/api/game/{}/{}", self.location, self.game_id, self.player_id).into_client_request().unwrap();


		let connector = Connector::NativeTls(
			native_tls::TlsConnector::builder()
				.danger_accept_invalid_certs(true)
				.build()
				.unwrap()
		);
		eprintln!("{:?}", request);

		let (mut ws_stream, _) = connect_async_tls_with_config(
			request,
			None,
			false,
			Some(connector),
			)
			.await
			.unwrap();
		self.send_game(&mut ws_stream);
		while let Some(msg) = ws_stream.next().await {
			match msg? {
				Message::Binary(text) => text,
				Message::Close(_) => {break;},
				_ => {continue;},
			};
		};
		Ok(())
	}
	async fn send_game(&self, ws_stream: &mut WebSocketStream<MaybeTlsStream<TcpStream>>) -> Result<()> {
		loop {
			let mut to_send = String::new();
			let event = event::read()?;
			if let Event::Key(key_event) = event {
				let to_append: char = match key_event.code {
					KeyCode::Up => 'U',
					KeyCode::Down => 'D',
					_ => return Ok(()),
				};
				to_send.push(to_append);
			}
			ws_stream.send(to_send.into()).await?;
		}
	}
}


// async startGame(): Promise<void>
// 	{
// 		await fetch(`https://${window.location.host}/api/start-game/${this.gameId}`,
// 		{
// 			method: 'POST',
// 		});

// 		this.socket = new WebSocket(`wss://${window.location.host}/api/game/${this.gameId}/${this.playerId}`);
// 		this.socket.binaryType = 'arraybuffer';

// 		this.socket.onopen = () =>
// 		{
// 			this.setupEventListeners();
// 			this.interval = setInterval(() => { this.send(); }, GameClient.IPS_INTERVAL);
// 		};

// 		this.socket.onmessage = (event) =>
// 		{
// 			this.updateGameState(event.data);
// 		};

// 		this.socket.onclose = () =>
// 		{
// 			this.stopGameLoop();
// 		};

// 		this.socket.onerror = (error) =>
// 		{
// 			console.error('WebSocket error:', error);
// 			this.stopGameLoop();
// 		};
// 	}




//  Response: Object {"gameId": String("442c772e-0ec8-447e-8f1d-b87f00c76380"), 
//"opponentId": String("35"), 
//"playerId": Number(2)}

// pub struct {

// }

/*
Need to do when I create a game
    -> login or play as guest --> connect through wss?
        Gameclient->Front->Startgame
    -> select which mode
    -> get infos from db (Guest or infos)
    -> init --> POST to /api/whatever?

*/