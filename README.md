# ft_transcendence

**A pong game** : Pong game written in Typescript.

---

## 📌 Prerequisites
- **OS**: Linux (Ubuntu 22.04+ recommended)
- **Tools**:
  - `make`
  - `docker`/`docker-compose`
  - `git`

---

## 🚀 Installation

### From Source
```bash
git clone https://github.com/Maxime-juncker/ft_transcendence.git
cd ft_transcendence
make  # Build and launch the project
```
Then go to https://localhost:8081 and play !  
Grafana is accessible at http://localhost:3001  
Kibana is accessible at http://localhost:5601  


## 📂 Project Structure
```
ft_transcendence/
├── backend/
│   ├── src/                      # Backend sources
│   └── config.json               # Default users to be created at first launch
├── elk/
│   ├── elasticsearch/config/     # Elasticsearch config files
│   ├── kibana/config/            # Kibana config files
│   └── logstash/                 # Logstash config
│       └── pipeline/             # Logstash pipelines config
├── frontend/src/                 # Frontend sources
├── modsecurity/conf/modsec/      # ModSecurity config files
├── monitoring/conf/
│   ├── grafana/                  # Grafana config files
│   └── prometheus/               # Prometheus config files
├── shared/                       # Good question ?
├── vault/conf/vault.hcl          # Hashi Corp Vault config
├── .env.sample                   # .env sample
├── docker-compose.yml            # Docker compose file for the whole project
├── Makefile
└── README.md                     # This file
```