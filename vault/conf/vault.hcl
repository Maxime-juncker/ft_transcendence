ui            = true
cluster_addr  = "https://0.0.0.0:8201"
api_addr      = "https://0.0.0.0:8000"
disable_mlock = true

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address       = "0.0.0.0:8000"
  tls_disable	= true
}
