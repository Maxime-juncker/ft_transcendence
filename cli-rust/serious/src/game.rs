use reqwest::get;

enum Params
{
	PADDLE_HEIGHT = 15,
	PADDLE_WIDTH = 2,
	PADDLE_PADDING = 2,
	BALL_SIZE = 2,
	BACKGROUND_OPACITY = 0.4,
	COLOR = (255, 255, 255),
	COUNTDOWN_START = 3,
	IPS = 60,
}

enum Keys
{
	PLAY_AGAIN = "Enter",
	DEFAULT_UP = "ArrowUp",
	DEFAULT_DOWN = "ArrowDown",
	PLAYER1_UP = "z",
	PLAYER1_DOWN = "s",
	PLAYER2_UP = "ArrowUp",
	PLAYER2_DOWN = "ArrowDown",
}

enum Msgs
{
	SEARCHING = "Searching for opponent...",
	WIN = "wins !",
	PLAY_AGAIN = "Press ${Keys.PLAY_AGAIN} to play again",
}


pub fn create_game(game_main: &infos, mode: String) -> impl Future<Result<()>> {
    let client = reqwest::Client::new();
    let mut map = Hasmap::new();
    map.insert("mode", &mode);
//    map.insert("playerName", userid);
    let url = format!("https://{infos.location}/api/create-game");
    let response = client.post(url)
        .headers("{ 'Content-Type': 'application/json' }")
        .json(&map)
        .send()
        .await?
        .json()
        .await?;

    console.log(response);


}
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