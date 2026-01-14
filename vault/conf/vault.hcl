ui            = true
cluster_addr  = "http://0.0.0.0:8201"
api_addr      = "http://0.0.0.0:8200"
disable_mlock = true

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable	= true
}

log_file = "/vault/logs/vault.log"

log_rotate_bytes     = 104857600
log_rotate_duration  = "24h"
log_rotate_max_files = 14