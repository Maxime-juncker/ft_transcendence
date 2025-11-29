use reqwest::{
	header::HeaderMap,
	Client,
};

use crossterm::event::{self, poll, Event, KeyCode, KeyModifiers};
use futures_util::{StreamExt, SinkExt};
use futures_util::stream::SplitSink;
use std::time::Duration;
use std::{
	collections::HashMap,
	error::Error,
	io::{Stdout, stdout},
};

use crate::welcome::display;

use bytes::Bytes;

use tokio_tungstenite::connect_async_tls_with_config;
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::Connector;
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

use std::thread::{sleep};

use anyhow::{Result, anyhow};

use crate::Infos;

use tokio::sync::mpsc;
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

pub async fn create_game<'a>(game_main: &Infos, stdout: &Stdout, mode: &str) -> Result<(), Box<dyn Error>> {
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
	game.start_game(stdout).await?;
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
	async fn start_game(&self, mut stdout: &Stdout) -> Result<()> {
		let url = format!("https://{}/api/start-game/{}", self.location, self.game_id);
		let toprint = self.client.post(url).send().await.unwrap();
		// eprintln!("POST RESPONSE  {:?}", toprint);
		let body = toprint.text().await.unwrap();
		// eprintln!("Body: {:?}", body);
		let request = format!("wss://{}/api/game/{}/{}", self.location, self.game_id, self.player_id).into_client_request().unwrap();

		let connector = Connector::NativeTls(
			native_tls::TlsConnector::builder()
				.danger_accept_invalid_certs(true)
				.build()
				.unwrap()
		);

		// eprintln!("We are here {:?}", request);

		let (mut ws_stream, _) = connect_async_tls_with_config(
			request,
			None,
			false,
			Some(connector),
			).await
			.unwrap();
		let (mut ws_write, mut ws_read) = ws_stream.split();
		eprintln!("Coucou les copains");
		let (sender, mut receiver): (mpsc::Sender<u8>, mpsc::Receiver<u8>) = mpsc::channel(1);
		tokio::spawn(async move {
			Self::send_game(&mut ws_write, receiver).await;
		}); 
		while let Some(msg) = ws_read.next().await {
			match msg? {
				Message::Binary(text) => {self.decode_and_display(text, stdout)},
				Message::Close(_) => {
					let u: u8 = 1;
					sender.send(u).await.unwrap();
					break;
				},
				_ => {continue;},
			};

		};
		Ok(())
	}
	fn decode_and_display(&self, msg: Bytes, mut stdout: &Stdout) {
		// eprintln!("{:?}", msg);
		// sleep(Duration::from_secs(1));
		let decoded = Self::decode(msg, stdout);
		display(decoded, stdout);
	}
	fn decode(msg: Bytes, mut stdout: &Stdout) -> (f32, f32, f32, f32, f32, f32, u8, u8) {
		let left_y: f32 = f32::from_le_bytes(msg[0..4].try_into().unwrap());
		let right_y: f32 = f32::from_le_bytes(msg[4..8].try_into().unwrap());
		let ball_x: f32 = f32::from_le_bytes(msg[8..12].try_into().unwrap());
		let ball_y: f32 = f32::from_le_bytes(msg[12..16].try_into().unwrap());
		let speed_x: f32 = f32::from_le_bytes(msg[16..20].try_into().unwrap());
		let speed_y: f32 = f32::from_le_bytes(msg[20..24].try_into().unwrap());
		let player1_score: u8 =  msg[24];
		let player2_score: u8 =  msg[25];
		(left_y, right_y, ball_x, ball_y, speed_x, speed_y, player1_score, player2_score)
	}
	async fn send_game(ws_write: &mut SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>, mut receiver: mpsc::Receiver<u8>) -> Result<()> {
		// eprintln!("Here we are");
		tokio::spawn( async move {
			match receiver.recv().await {
				Some(_) => {return Ok(());},
				_ => {return Err(anyhow::anyhow!("error from receiver"))}, 
			}
			return Err(anyhow::anyhow!("Error, parent task hung hup"));
		});
		loop {
			let mut to_send = String::new();
			let event = event::read()?;
			// eprintln!("Event read");
			if let Event::Key(key_event) = event {
				let to_append: char = match key_event.code {
					KeyCode::Up => 'U',
					KeyCode::Down => 'D',
					_ => return Ok(()),
				};
				to_send.push(to_append);
			}
			ws_write.send(to_send.into()).await?;
		}
	}
}

// enum StateIndex
// {
// 	LEFT_PADDLE_Y = 0,
// 	RIGHT_PADDLE_Y = 1,
// 	BALL_X = 2,
// 	BALL_Y = 3,
// 	SPEED_X = 4,
// 	SPEED_Y = 5,
// 	PLAYER1_SCORE = 0,
// 	PLAYER2_SCORE = 1
// }


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