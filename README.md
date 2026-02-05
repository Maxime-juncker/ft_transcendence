# FT_TRANSCENDENCE

> pong but better :)

ft_transcendence is the final project of the forty two common core, it involve making a full stack app in typescript, using a database, docker, nodejs, html / css \
the goal of this project is to recreate the famous pong game but with more features.

## Features

Web:
- Blockchain
- Framework to build the backend (fastify)
- Framwork / toolkit to build the frontend (tailwindcss)
- Database for the backend (sqlite)

User Managment:
- Standard user managment, (authentication, user profile, friends, etc...)
- Remote authentification using OAuth2 (support 42 and github OAuth2)

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
- Log managment (Elasticsearch, Logstash, Kibana)
- Monitoring system (Prometheus and Grafana)

Accessibility:
- Expanding browser compatibility
- Support multiple languages (en, fr, es)

Server-Side Pong:
- Server side pong
- Gameplay via CLI (rust app)

## Installation
### Prerequisites
Before going further you will need theses tools:
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
|RUN_BENCHMARK|if set to 1, benchamrk will run (create random user / games / etc...)|
| GITHUB_ID | ID of your github OAuth app |
|PROTECTED_ROUTE_PASS| password for protected routes (e.g: /add_game)|
| GITHUB_SECRET | secret of your github OAuth app |
| FT_ID | ID of your 42 OAuth app |
| FT_SECRET | secret of your 42 OAuth app |
| ELASTIC_PASSWORD | password of elastic webui (need to be >= 8 Length)|
| GRAFANA_PASSWORD | password of grafana webui (need to be >= 8 Length)|
| LOGSTASH_PASSWORD | password of logstash (need to be >= 8 Length) |
| LOGSTASH_WRITER_PASSWORD | password of logstash writter (need to be >= 8 Length)|


### Run the project
```bash
git clone https://github.com/Maxime-juncker/ft_transcendence.git
cd ft_transcendence
make
```
run a benchamrk (will test user creation / login / game history)
```bash
docker compose --profile benchmark up
```

The first launch will take around ~3min.

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
