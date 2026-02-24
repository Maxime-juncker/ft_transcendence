# FT_TRANSCENDENCE

> pong but better :)

ft_transcendence is the final project of the forty two common core, it involves making a full stack app in typescript, using a database, docker, nodejs, html / css \
the goal of this project is to recreate the famous pong game but with more features.  

test live [here](https://transcendence.flamby.ovh)

## Features

Web:
- Blockchain
- Framework to build the backend (fastify)
- Framework / toolkit to build the frontend (tailwindcss)
- Database for the backend (sqlite)

User Management:
- Standard user management, (authentication, user profile, friends, etc...)
- Remote authentication using OAuth2 (support 42 and github OAuth2)

Gameplay and user experience:
- Remote player
- Live chat (with chat commands)
- Theme management

AI Algo
- AI opponent
- User and game stats dashboard

Cybersecurity:
- WAF / ModSecurity and HashiCorp Vault
- Two Factor Auth and JWT tokens

Devops:
- Log management (Elasticsearch, Logstash, Kibana)
- Monitoring system (Prometheus and Grafana)

Accessibility:
- Expanding browser compatibility
- Support multiple languages (en, fr, es)

Server-Side Pong:
- Server side pong
- Gameplay via CLI (rust app)

## Installation
### Prerequisites
Before going further you will need these tools:
- make
- docker and docker compose plugin

You will need to setup a .env (a .env-sample is provided just rename it .env)

> [!IMPORTANT]
> if you want to use OAuth2 service \
> you will need to register an app for the service (42 or github)

### .env setup
|variable|description|
|----|----|
| HOST | hostname or IP used for redirection (leave to localhost if unsure)|
| PORT | port (default: 8081)|
|RUN_BENCHMARK|if set to 1, benchmark will run (create random user / games / etc...)|
| GITHUB_ID | ID of your github OAuth app |
|PROTECTED_ROUTE_PASS| password for protected routes (e.g: /add_game)|
| GITHUB_SECRET | secret of your github OAuth app |
| FT_ID | ID of your 42 OAuth app |
| FT_SECRET | secret of your 42 OAuth app |
| ELASTIC_PASSWORD | password of elastic webui (need to be >= 8 Length)|
| GRAFANA_PASSWORD | password of grafana webui (need to be >= 8 Length)|
| LOGSTASH_PASSWORD | password of logstash (need to be >= 8 Length) |
| LOGSTASH_WRITER_PASSWORD | password of logstash writer (need to be >= 8 Length)|
|AVAX_INFURA| blockchain endpoint |
|PRIVATE_KEY| private key for avalanche|
|PADDLE_SPEED| speed of the paddle in game (default: 1.5)|
|BALL_SPEED| speed of the BALL in game (default: 1.5)|
|BALL_SPEED_INCREMENT| amount of speed gain at each bounce (default: 0.1)|
|POINTS_TO_WIN| amount of point to win a game (default: 11)|
|MAX_ANGLE| max random angle the ball can go when starting round (default: 1.5)|
|PADDLE_HEIGHT| height of the paddles in % of the game view (default: 15)|
|PADDLE_WIDTH| width of the paddles in % of the game view (default: 2)|
|PADDLE_PADDING| padding of the paddles in % of the game view (0 = paddle touch the border) (default: 2)|
|BALL_SIZE| size of the ball in % of the game view (default: 2)|

### Run the project
```bash
git clone https://github.com/Maxime-juncker/ft_transcendence.git
cd ft_transcendence
make
```

The first launch will last around ~3min.

### Access Services
|service | link|
|-------|-----|
| Main pong site | https://localhost:8081 |
| Grafana | https://localhost:8081/admin/grafana/ |
| Kibana | https://localhost:8081/admin/kibana/ |

> [!TIP]
> Want to learn about the api ? \
> [Click here](https://github.com/Maxime-juncker/ft_transcendence/wiki)

### Screenshots

![Description](https://i.imgur.com/DabIcir.png)
![Description](https://imgur.com/8rKfhfs.png)
![Description](https://imgur.com/NVfisSA.png)

### Contributors
[@abidolet](https://github.com/abidolet/) \
[@ygille](https://github.com/Bluesmoothie/) \
[@sithomas](https://github.com/Sths147) \
[@mjuncker](https://github.com/Maxime-juncker)
