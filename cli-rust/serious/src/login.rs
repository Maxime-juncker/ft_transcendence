use reqwest::{Client};
use serde_json::Value;
use anyhow::{Result, anyhow};
use std::io::{stdout, Stdout};

use tokio_tungstenite::connect_async_tls_with_config;
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio::net::TcpStream;
use tokio_tungstenite::Connector;
use futures_util::{StreamExt, SinkExt};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::protocol::Message;



pub async fn create_guest_session(location: &String, mut stdout: &Stdout) -> 
                                        Result<(u64, Client, mpsc::Receiver<serde_json::Value>)> {
    let apiloc = format!("https://{location}/api/user/guest_cli");
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap();
    let res = client.post(apiloc)
        .send()
        .await
        .unwrap();

    let value: serde_json::Value = res.json().await.unwrap();
    eprintln!("{value}");
    let player_id = match value["data"]["id"].as_u64(){
      Some(nbr) => nbr,
      None => return Err(anyhow::anyhow!("Error from server, no data received")),
    };
    let receiver = enter_chat_room(location, player_id).await.unwrap();
    Ok((player_id, client, receiver))
}

async fn enter_chat_room(location: &String, id: u64) -> Result<mpsc::Receiver<serde_json::Value>> {
    let connector = Connector::NativeTls(
			native_tls::TlsConnector::builder()
				.danger_accept_invalid_certs(true)
				.build()
				.unwrap()
		);

	let request = format!("wss://{}/api/chat?/userid={}", location, id);
	let (mut ws_stream, _) = connect_async_tls_with_config(
			request,
			None,
			false,
			Some(connector),
			)
            .await
			.unwrap();

    let (sender, receiver): (mpsc::Sender<serde_json::Value>, mpsc::Receiver<serde_json::Value>)  = mpsc::channel(1024);
    tokio::spawn(async move {
        chat(ws_stream, sender).await.unwrap()
    });
    
    // eprintln!("Message from chat room : {}", message);
    Ok(receiver)
}

async fn   chat(mut ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>>, sender: mpsc::Sender<serde_json::Value>) -> Result<()> {
    loop {
        let message = match ws_stream.next().await.unwrap().unwrap() {
        Message::Text(text) => Some(text),
        _ => None,
    };
    eprintln!("Message from chat room : {:#?}", message);

    if let Some(msg) = message {
        let message: serde_json::Value = serde_json::from_str(msg.as_str())
                .unwrap();
        
        let _ = match message["gameId"].as_str() {

            Some(_) => {sender.send(message).await.unwrap()},
            None => {continue;}
        };
    }
    }
} 