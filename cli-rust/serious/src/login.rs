use reqwest::{Client};
use serde_json::Value;
use anyhow::{Result, anyhow};
use std::io::{stdout, Stdout};

pub async fn create_guest_session(location: &String, mut stdout: &Stdout) -> Result<(u64, Client)> {
    let apiloc = format!("{location}/api/user/guest_cli");
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap();
    let res = client.post(apiloc)
        .send()
        .await
        .unwrap();

    let value: serde_json::Value = res.json().await.unwrap();
    let return_value = match value["data"]["id"].as_u64(){
      Some(nbr) => nbr,
      None => return Err(anyhow::anyhow!("Error from server, no data received")),
    };
    Ok((return_value, client))
}