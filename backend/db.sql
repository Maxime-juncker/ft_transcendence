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
	user_id					INTEGER,
	friend_id				INTEGER,
	is_accepted				INTEGER,

    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),

	CHECK(user_id < friend_id)
);

CREATE TABLE IF NOT EXISTS game_result (
	id				INTEGER PRIMARY KEY AUTOINCREMENT,

	player1_id		INTEGER,
	player2_id		INTEGER,
	player1_score	INTEGER,
	player2_score	INTEGER,

	timer			INTEGER
);
