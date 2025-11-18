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
	rank			INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS blocked_usr (
	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER NOT NULL,

    PRIMARY KEY (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS friends (
	user1_id		INTEGER NOT NULL,
	user2_id		INTEGER NOT NULL,

	pending			INTEGER NOT NULL,
	sender_id		INTERER NOT NULL,

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

	created_at		DATE NOT NULL,

    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),

	CHECK(user1_id < user2_id)
);
