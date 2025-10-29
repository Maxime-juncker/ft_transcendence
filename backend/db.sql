CREATE TABLE IF NOT EXISTS users (
	id		INTEGER PRIMARY KEY AUTOINCREMENT,
	name	STRING NOT NULL UNIQUE,
	email	STRING NOT NULL UNIQUE,
	passw	STRING NOT NULL,

	is_login		INTEGER NOT NULL, -- if false => override status
	status			INTEGER NOT NULL, -- (un)avalaible - buzy - silent

	elo				INTEGER NOT NULL DEFAULT 500,
	wins			INTEGER NOT NULL DEFAULT 0,
	losses			INTEGER NOT NULL DEFAULT 0,
	game_played		INTEGER NOT NULL DEFAULT 0,

	profile_picture	STRING  NOT NULL DEFAULT ""
);

CREATE TABLE IF NOT EXISTS friends (
	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER NOT NULL,

	pending			INTEGER NOT NULL,
	sender_id		INTERER NOT NULL,

    PRIMARY KEY (user1_id, user2_id) ,
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),

	CHECK(user1_id < user2_id)
);

CREATE TABLE IF NOT EXISTS games (
	id				INTEGER PRIMARY KEY AUTOINCREMENT,

	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER,
	user1_score		INTEGER,
	user2_score		INTEGER,

    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),

	CHECK(user1_id < user2_id)
);
