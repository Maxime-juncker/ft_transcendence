CREATE TABLE IF NOT EXISTS users (
	id				INTEGER PRIMARY KEY AUTOINCREMENT,
	name			STRING NOT NULL UNIQUE,
	email			STRING UNIQUE,
	passw			STRING,

	totp_enable		BOOLEAN NOT NULL DEFAULT false,
	totp_seed		STRING NOT NULL DEFAULT "",

	is_login		INTEGER NOT NULL DEFAULT 0, -- if false => override status
	status			INTEGER NOT NULL DEFAULT 0, -- (un)avalaible - buzy - silent

	elo				INTEGER NOT NULL DEFAULT 1000,
	wins			INTEGER NOT NULL DEFAULT 0,
	games_played	INTEGER NOT NULL DEFAULT 0,

	avatar			STRING  NOT NULL DEFAULT "",

	-- 0=internal; 1=oauth 42; 2=oauth github; -1=guest
	source			INTEGER	NOT NULL DEFAULT 0,
	oauth_id		STRING NOT NULL DEFAULT 0,

	-- 1=player 0=admin
	rank			INTEGER NOT NULL DEFAULT 1,
	created_at		DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_usr (
	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER NOT NULL,
	blocked_by		INTEGER NOT NULL,

	PRIMARY KEY (user1_id, user2_id)
	CHECK(user1_id < user2_id)
);

CREATE TABLE IF NOT EXISTS friends (
	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER NOT NULL,

	pending			INTEGER NOT NULL,
	sender_id		INTEGER NOT NULL,

	PRIMARY KEY (user1_id, user2_id),
	FOREIGN KEY (user1_id) REFERENCES users(id),
	FOREIGN KEY (user2_id) REFERENCES users(id),

	CHECK(user1_id < user2_id)
);

CREATE TABLE IF NOT EXISTS games (
	id				INTEGER PRIMARY KEY AUTOINCREMENT,

	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER NOT NULL,
	user1_score		INTEGER NOT NULL,
	user2_score		INTEGER NOT NULL,

	user1_elo		INTEGER NOT NULL,
	user2_elo		INTEGER NOT NULL,

	created_at		DATE NOT NULL,

	FOREIGN KEY (user1_id) REFERENCES users(id),
	FOREIGN KEY (user2_id) REFERENCES users(id),

	CHECK(user1_id < user2_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
	id				TEXT PRIMARY KEY,
	name			TEXT NOT NULL,
	owner_id		INTEGER NOT NULL,
	status			TEXT NOT NULL,
	winner_id		INTEGER,
	created_at		DATE NOT NULL,
	FOREIGN KEY (owner_id) REFERENCES users(id),
	FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tournament_participants (
	tournament_id	TEXT NOT NULL,
	user_id			INTEGER NOT NULL,
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
	FOREIGN KEY (user_id) REFERENCES users(id),
	PRIMARY KEY (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
	id				INTEGER PRIMARY KEY AUTOINCREMENT,
	tournament_id	TEXT NOT NULL,
	player1_id		INTEGER,
	player2_id		INTEGER,
	winner_id		INTEGER,
	score1			INTEGER DEFAULT 0,
	score2			INTEGER DEFAULT 0,
	played_at		DATE,
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

