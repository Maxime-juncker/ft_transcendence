var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Fastify from 'fastify';
import sqlite3 from 'sqlite3';
// const Fastify = require('fastify')
// const sqlite  = require('sqlite3');
const fastify = Fastify({ logger: true });
await fastify.register(import('@fastify/multipart'));
// setup db
const db = new sqlite3.Database('/var/lib/sqlite/app.sqlite', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        return console.error('Failed to connect:', err.message);
    }
});
function validate_email(email) {
    return String(email)
        .toLowerCase()
        .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
}
fastify.post('/api/login', (request, reply) => {
    const { email, passw } = request.body;
    const sql = 'SELECT * FROM users WHERE email = ? AND passw = ?';
    db.get(sql, [email, passw], function (err, row) {
        if (err) {
            reply.code(500).send({ message: `database error: ${err.message}` });
        }
        if (!row) {
            reply.code(404).send({ message: "email or password invalid" });
        }
        else {
            reply.code(200).send(row);
        }
    });
});
fastify.post('/api/create_user', (request, reply) => {
    const { email, passw, username } = request.body;
    const sql = 'INSERT INTO users (name, email, passw, profile_picture) VALUES (?, ?, ?, ?)';
    if (!validate_email(email)) {
        reply.code(403).send({ message: "error: email not valid" });
        return;
    }
    db.run(sql, [username, email, passw, "https://cdn.intra.42.fr/users/616bfcf39d03cf2beb33f41650012eb7/mjuncker.JPG"], function (err) {
        if (err) {
            console.error('Insert error:', err.message);
            reply
                .code(500)
                .send({ message: `database error: ${err.message}` });
            return;
        }
        else {
            console.log(`Inserted row with id ${this.lastID}`);
            reply
                .code(201)
                .send({ message: `Success` });
            return;
        }
    });
});
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fastify.listen({ port: 3000, host: '0.0.0.0' });
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
});
start();
