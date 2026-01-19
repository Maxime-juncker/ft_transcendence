# FT_TRANSCENDENCE

> pong but better :)

ft_transcendence is the final project of the forty two common core, it involve making a full stack app in typescript, using database, docker, nodejs, html / css \
the goal of this project is to recreate the famouse pong game but with some more feature.

## Features

Web:
- blockchain
- framework to build the backend (fastify)
- framwork / toolkit to build the frontend (tailwindcss)
- use a database for the backend (sqlite)

User Managment:
- standard user managment, (authentication, user profile, friends, etc...)
- remote authentification using OAuth2 (support 42 and github OAuth2)

Gameplay and user experience:
- Remote player
- Live chat (with chat commands)
- Theme managment

AI Algo
- AI opponent
- User and game stats dashboards

Cybersecurity:
- WAF / ModSecurity + HashiCorp Vault
- use Two Factor Auth + jwt tokens

Devops:
- Log managment (Elasticsearch, Logstash, Kibana)
- Monitoring system (Prometheus and Grafana)

Accessibility:
- Expanding browser compatibility
- Support multiple languages (en, fr, es)

Server-Side Pong:
- Server side pong
- pong gameplay via cli (rust app)

## Installation
### Prerequisites
before going further you will need theses tools:
- make
- docker + docker compose plugin

you will need to setup a .env (a .env-sample is provided just rename it .env)

> [!IMPORTANT]
> if you want to use OAuth2 service \
> you will need to register and app for the service (42 or github)

### .env setup
|variable|description|
|----|----|
| HOST | ip for redirection (leave to localhost if unsure)|
|RUN_BENCHMARK|if set to 1, benchamrk will be ran (create random user / games / etc...)|
| GITHUB_ID | id of your github oauth app |
| GITHUB_SECRET | secret of your github oauth app |
| FT_ID | id of your 42 oauth app |
| FT_SECRET | secret of your 42 oauth app |
| ELASTIC_PASSWORD | password of elastic service (need to be >= 8 Length)|
| GRAFANA_PASSWORD | password of grafana website (need to be >= 8 Length)|
| LOGSTASH_PASSWORD | password of logstash website (need to be >= 8 Length) |
| LOGSTASH_WRITER_PASSWORD | password of logstash writter (need to be >= 8 Length)|


### Run the project
```bash
git clone https://github.com/Maxime-juncker/ft_transcendence.git
cd ft_transcendence
make
```

the first launch will take around ~3min.

### Access Services
|service | link|
|-------|-----|
| main pong site | https://localhost:8081 |
| Grafana | https://localhost:8081/admin/grafana |
| Kibana | https://localhost:8081/admin/kibana |

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
