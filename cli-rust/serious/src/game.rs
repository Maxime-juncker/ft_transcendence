use reqwest::{
	header::HeaderMap,
};
use std::time::Duration;
use std::{
	collections::HashMap,
	error::Error,
};

use std::thread::{sleep};

use anyhow::{Result, anyhow};
use crate::Infos;

struct Game {
	info: &'static Infos,
	game_id: String,
	opponent_id: u64,
	player_id: u64,
}


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
// 	PLAY_AGAIN = "Enter",
// 	DEFAULT_UP = "ArrowUp",
// 	DEFAULT_DOWN = "ArrowDown",
// 	PLAYER1_UP = "z",
// 	PLAYER1_DOWN = "s",
// 	PLAYER2_UP = "ArrowUp",
// 	PLAYER2_DOWN = "ArrowDown",
// }

// enum Msgs
// {
// 	SEARCHING = "Searching for opponent...",
// 	WIN = "wins !",
// 	PLAY_AGAIN = "Press ${Keys.PLAY_AGAIN} to play again",
// }

pub async fn create_game(game_main: &'static Infos, mode: &str) -> Result<(), Box<dyn Error>> {
	let mut map = HashMap::new();
	let mut headers = HeaderMap::new();
	headers.insert("Content-Type", "application/json".parse()?);
    map.insert("mode", mode);
	let id: &str = &game_main.id.to_string();
	map.insert("playerName", id);
	let mut url = game_main.location.clone();
    url = format!("{url}/api/create-game");
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
		Err(_) => {
			std::process::exit(1);
			//to process
		},
	};
	game.launch_countdown().await;
	// sleep(Duration::from_secs(20));
	Ok(())
}

impl Game {
	fn new(info: &'static Infos, value: serde_json::Value) -> Result<Game> {
		let game_id: String = match value["gameId"].as_str() {
			Some(id) => id.to_string(),
			None => return Err(anyhow::anyhow!("No game Id in response")),
		};
		let opponent_id = match value["opponentId"].as_u64() {
			Some(nbr) => nbr,
			None => return Err(anyhow::anyhow!("No opponent id in response")),
		};
		let player_id: u64 = match value["playerId"].as_u64() {
			Some(nbr) => nbr,
			None => return Err(anyhow::anyhow!("No player Id in response")),
		};
		Ok(Game{info, game_id, opponent_id, player_id})
	}
	async fn launch_countdown(self) {
		//3...2....1....0 -->
		//Affiche le compte a rebours puis a 0 START GAME
		self.start_game().await;
	}
	async fn start_game(self) {
	
	}
}




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