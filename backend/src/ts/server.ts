const Fastify = require('fastify')
const sqlite  = require('sqlite3');

const fastify = Fastify({ logger: true })

// setup db
const db = new sqlite.Database('/var/lib/sqlite/app.sqlite', sqlite.OPEN_READWRITE, (err) => {
	if (err) {
		return console.error('Failed to connect:', err.message);
	}
});

function validate_email(email:string)
{
	return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
}

fastify.post('/api/login', (request:any, reply:any) => {
	const { email, passw } = request.body;
	const sql = 'SELECT * FROM users WHERE email = ? AND passw = ?';


	db.get(sql, [email, passw], function (err:any, row:any)
	{
		if (err)
		{
			reply.code(500).send({ message: `database error: ${err.message}` });
		}
		if (!row)
		{
			reply.code(404).send({ message: "email or password invalid" });
		}
		else
		{
			reply.code(200).send(row);
		}
	})

})


fastify.post('/api/create_user', (request:any, reply:any) => {
	const { email, passw, username } = request.body;
	const sql = 'INSERT INTO users (name, email, passw, profile_picture) VALUES (?, ?, ?, ?)';

	if (!validate_email(email))
	{
		reply.code(403).send({ message: "error: email not valid" });
		return ;
	}

	 db.run(sql, [username, email, passw, "https://cdn.intra.42.fr/users/616bfcf39d03cf2beb33f41650012eb7/mjuncker.JPG"], function (err:any) {
		if (err)
		{
			console.error('Insert error:', err.message);
			reply
				.code(500)
				.send({ message: `database error: ${err.message}`});
			return;
		}
		else
		{
			console.log(`Inserted row with id ${this.lastID}`);
			reply
				.code(201)
				.send({ message: `Success`});
			return;
		}
	})
})

const start = async () => {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
	} catch (err) {
		fastify.log.error(err);
		process.exit(1)
	}
}



start()
