CREATE TABLE IF NOT EXISTS users (
	id		INTEGER PRIMARY KEY AUTOINCREMENT,
	name	STRING NOT NULL UNIQUE,
	email	STRING NOT NULL UNIQUE,
	passw	STRING NOT NULL,

	status			INTEGER, -- (un)avalaible - buzy - silent
	elo				INTEGER,
	profile_picture	STRING
);

CREATE TABLE IF NOT EXISTS friends (
	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER NOT NULL,

	is_accepted		INTEGER NOT NULL,

    PRIMARY KEY (user1_id, user2_id) ,
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),

	CHECK(user1_id < user2_id)
);

CREATE TABLE IF NOT EXISTS game_result (
	id				INTEGER PRIMARY KEY AUTOINCREMENT,

	player1_id		INTEGER,
	player2_id		INTEGER,
	player1_score	INTEGER,
	player2_score	INTEGER,

	timer			INTEGER
);
