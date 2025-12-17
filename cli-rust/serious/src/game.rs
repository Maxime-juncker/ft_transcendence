use reqwest::{
	header::HeaderMap,
	Client,
};

use crossterm::{
    cursor,
    event::{self, poll, Event, KeyCode, KeyEventKind},
    style::*,
    terminal,
    ExecutableCommand,
    QueueableCommand,
};

use futures_util::{StreamExt, SinkExt};
use futures_util::stream::SplitSink;
use std::time::Duration;
use std::{
	collections::HashMap,
	io::{Write, stdout},
};

use crate::{HEIGHT, WIDTH};



use crate::{should_exit, cleanup_and_quit};
use bytes::Bytes;

use tokio_tungstenite::{connect_async_tls_with_config, tungstenite::Utf8Bytes};
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::Connector;
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

use anyhow::{Result, anyhow};

use crate::Infos;

use tokio::sync::mpsc;
use tokio::net::TcpStream;

struct Game {
	location: String,
	original_size: (u16, u16),
	id: u64,
	client: Client,
	game_id: String,
	opponent_id: u64,
	player_side: u64,
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

async fn send_post_game_request(game_main: &Infos, mode: &str) -> Result<()> {
	let mut map = HashMap::new();
	let mut headers = HeaderMap::new();
	headers.insert("Content-Type", "application/json".parse()?);
    map.insert("mode", mode);
	let id: &str = &game_main.id.to_string();
	map.insert("playerName", id);
	let mut url = game_main.location.clone();
	url = format!("https://{url}/api/create-game");
	game_main.client.post(url)
        .headers(headers)
        .json(&map)
        .send()
        .await?;
	Ok(())
}

async fn send_remove_from_queue_request(game_main: &Infos) -> Result<()> {
	let mut map = HashMap::new();
	let mut headers = HeaderMap::new();
	headers.insert("Content-Type", "application/json".parse()?);
	let id: &str = &game_main.id.to_string();
	map.insert("id", id);
	let mut url = game_main.location.clone();
	url = format!("https://{url}/api/chat/removeQueue");
	game_main.client.delete(url)
        .headers(headers)
        .json(&map)
        .send()
        .await?;

	Ok(())
}

pub async fn create_game(game_main: &Infos, mode: &str, mut receiver: mpsc::Receiver<serde_json::Value>) 
										-> Result<mpsc::Receiver<serde_json::Value>, (String, mpsc::Receiver<serde_json::Value>)> {
	if let Err(_) = send_post_game_request(game_main, mode).await {
		return Err(("error, no data received from server".to_string(), receiver));
	};
	if let Err(_) = waiting_screen() {
		return Err(("error, no data received from server".to_string(), receiver));
	};
	loop {
		match poll(Duration::from_millis(16)) {
			Ok(true) => {
				if !receiver.is_empty() {
					break ;
				}
				let event = match event::read() {
				Ok(event) => event,
				_ => return Err(("error in read".to_string(), receiver))
				};
				match should_exit(&event) {
					Ok(true) => {
						if let Err(_) = send_remove_from_queue_request(game_main).await {
							return Err(("error: could not send request to remove from list".to_string(), receiver));
						};
						return Ok(receiver);},
					Ok(false) => {},
					_ => return Err(("event error".to_string(), receiver))
				}
			},
			Ok(false) => {
				if !receiver.is_empty() {
					break ;
				}
			},
			_ => return Err(("error in poll".to_string(), receiver))
		};
	}
	let response = match receiver.recv().await {
		Some(value) => value,
		_ => return Err(("error, no data received from server".to_string(), receiver)),
	};
	let game = match Game::new(game_main, response) {
		Ok(game) => game,
		_ => return Err(("error creating game".to_string(), receiver)),
	};
	if let Err(e) = game.start_game().await {
		return Err((e.to_string(), receiver));
	};
	Ok(receiver)
}

// fn wrong_resize_waiting_screen(event: &Event) -> Result<bool> {
//   if let Event::Resize(x,y ) = event {
//     if *x < WIDTH || *y < HEIGHT {
//       return Ok(true);
//     }
//   }
//   Ok(false)
// }


impl Game {
	fn new(info: &Infos, value: serde_json::Value) -> Result<Game> {
		let game_id: String = match value["gameId"].as_str() {
			Some(id) => id.to_string(),
			_ => return Err(anyhow!("No game Id in response")),
		};
		let opponent_id = match value["opponentId"].as_u64() {
			Some(id) => id,
			_ => return Err(anyhow!("No opponent id in response")),
		};
		let player_side: u64 = match value["playerSide"].as_u64() {
			Some(nbr) => nbr,
			_ => return Err(anyhow!("No player Id in response")),
		};
		Ok(Game{location: info.location.clone(), original_size: info.original_size, id: info.id, client: info.client.clone(), game_id, opponent_id, player_side})
	}
	// async fn launch_countdown(&self) -> Result<()> {
	// 	//3...2....1....0 -->
	// 	//Affiche le compte a rebours puis a 0 START GAME
	// 	self.start_game().await?;
	// 	Ok(())
	// }
	async fn start_game(&self) -> Result<()> {
		let url = format!("https://{}/api/start-game/{}", self.location, self.game_id);
		self.client.post(url).send().await?;
		let request = format!("wss://{}/api/game/{}/{}", self.location, self.game_id, self.player_side).into_client_request()?;

		let connector = Connector::NativeTls(
			native_tls::TlsConnector::builder()
				.danger_accept_invalid_certs(true)
				.build()?
		);
		let (ws_stream, _) = connect_async_tls_with_config(
			request,
			None,
			false,
			Some(connector),
			).await?;
		let (mut ws_write, mut ws_read) = ws_stream.split();
		let (sender, receiver): (mpsc::Sender<u8>, mpsc::Receiver<u8>) = mpsc::channel(1);
		let cloned_size = self.original_size.clone();
		tokio::spawn(async move {
			Self::send_game(&mut ws_write, receiver, cloned_size).await.unwrap();
		}); 
		while let Some(msg) = ws_read.next().await {
			match msg? {
				Message::Binary(text) => {self.decode_and_display(text)},
				Message::Text(text) => {
					self.end_game(text, sender).await?;
					break;
				},
				Message::Close(_) => {
					let u: u8 = 1;
					sender.send(u).await?;
					break;
				},
				_ => {continue;},
			};
		};
		Ok(())
	}
	async fn end_game(&self, text: Utf8Bytes, sender: mpsc::Sender<u8>) -> Result<()> {
		let value = serde_json::to_string(text.as_str())?;
		let text_to_display: &str = match value.find(&self.id.to_string()) {
			Some(_) => "You win :)",
			_ => "You lose",
		};
		display_end_game(&text_to_display)?;
		let u: u8 = 1;
		sender.send(u).await?;
		Ok(())
	}
	fn decode_and_display(&self, msg: Bytes) -> Result<()> {
		if msg.len() == 26 {
			let decoded = Self::decode(msg)?;
			display(decoded)?;
		}
		Ok(())
	}
	fn decode(msg: Bytes) -> Result<(f32, f32, f32, f32, f32, f32, u8, u8)> {
		let left_y: f32 = f32::from_le_bytes(msg[0..4].try_into()?);
		let right_y: f32 = f32::from_le_bytes(msg[4..8].try_into()?);
		let ball_x: f32 = f32::from_le_bytes(msg[8..12].try_into()?);
		let ball_y: f32 = f32::from_le_bytes(msg[12..16].try_into()?);
		let _speed_x: f32 = f32::from_le_bytes(msg[16..20].try_into()?);
		let _speed_y: f32 = f32::from_le_bytes(msg[20..24].try_into()?);
		let player1_score: u8 =  msg[24];
		let player2_score: u8 =  msg[25];
		Ok((left_y, right_y, ball_x, ball_y, _speed_x, _speed_y, player1_score, player2_score))
	}
	async fn send_game(ws_write: &mut SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>, mut receiver: mpsc::Receiver<u8>, original_size: (u16, u16)) -> Result<()> {
		let mut up:bool = false;
		let mut down: bool = false;
		let mut to_send = String::new();
		loop {
			if let Ok(_) = receiver.try_recv() {
				break Ok(());
			}
			to_send.clear();
			if up == true {
				to_send.insert_str(0, "U");
			}
			if down == true {
				to_send.insert_str(0, "D");
			}
			let send_it = to_send.clone();
			ws_write.send(send_it.into()).await?;
			if poll(Duration::from_millis(16))? {

				let event = event::read()?;
				if should_exit(&event)? == true {
						cleanup_and_quit(&original_size)?;
				} else if let Event::Key(key_event) = event {
						match key_event.code {
							KeyCode::Up => {
								up = match key_event.kind {
									KeyEventKind::Press => true,
									KeyEventKind::Repeat => true,
									KeyEventKind::Release => false,
								};
							},
							KeyCode::Down =>{
								down = match key_event.kind {
									KeyEventKind::Press => true,
									KeyEventKind::Repeat => true,
									KeyEventKind::Release => false,
								};
							},
							_ => {continue;},
					}
				};
			}
			else {
				to_send.clear();
				up = false;
				down = false;
			}
		}
	}
}

fn normalize(message: (f32, f32, f32, f32, f32, f32, u8, u8)) -> (u16, u16, u16, u16, f32, f32, u8, u8) {
    let (left_y, right_y, ball_x, ball_y, _speed_x, _speed_y, player1_score, player2_score) = message;
    let my_left_y = (left_y * HEIGHT as f32 / 100.0) as u16;
    let my_right_y = (right_y * HEIGHT as f32 / 100.0) as u16;
    let my_ball_y = (ball_y * HEIGHT as f32 / 100.0) as u16;
    let my_ball_x = (ball_x * WIDTH as f32 / 100.0) as u16;
    (my_left_y, my_right_y, my_ball_x, my_ball_y, _speed_x, _speed_y, player1_score, player2_score)
}

fn display(message: (f32, f32, f32, f32, f32, f32, u8, u8)) -> Result<()> {
    stdout().execute(terminal::Clear(terminal::ClearType::All))?;
    let normalized = normalize(message);
    let (left_y, right_y, ball_x, ball_y, speed_x, speed_y, player1_score, player2_score) = normalized;
    // borders(&stdout)?;
    stdout()
        .queue(cursor::MoveTo(ball_x, ball_y))?
        .queue(Print("o"))?
        .queue(cursor::MoveTo(1, left_y))?
        .queue(Print("I"))?
        .queue(cursor::MoveTo(WIDTH - 1, right_y))?
        .queue(Print("I"))?;
    stdout().flush()?;
    Ok(())
}

fn waiting_screen() -> Result<()> {
	stdout().execute(terminal::Clear(terminal::ClearType::All))?;
	stdout()
		.queue(cursor::MoveTo(45, 15))?
		.queue(Print("Waiting for opponents"))?;
	stdout().flush()?;	
	Ok(())
}

fn display_end_game(message: &str) -> Result<()> {
	stdout().execute(terminal::Clear(terminal::ClearType::All))?;
	stdout()
		.queue(cursor::MoveTo(WIDTH / 2, HEIGHT / 2))?
		.queue(Print(message))?
		.queue(cursor::MoveTo(WIDTH/2, HEIGHT / 2 + 3))?
		.queue(Print("Press Esc to continue"))?;
	stdout().flush()?;
	loop {
		let event = event::read()?;
	
		if should_exit(&event)? == true {
			break ;
		}
	}
	Ok(())
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