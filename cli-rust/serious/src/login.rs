use reqwest::{Client};
use anyhow::{Result, anyhow};

use tokio_tungstenite::{
    connect_async_tls_with_config,
    MaybeTlsStream,
    WebSocketStream,
    Connector,
    tungstenite::protocol::Message,
};

use tokio::net::TcpStream;
use tokio::sync::mpsc;
use futures_util::{StreamExt};



pub async fn create_guest_session(location: &String) -> 
                                        Result<(u64, Client, mpsc::Receiver<serde_json::Value>)> {
    let apiloc = format!("https://{location}/api/user/guest_cli");
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;
    let res = client.post(apiloc)
        .send()
        .await?;

    let value: serde_json::Value = res.json().await?;
    eprintln!("{value}");
    let player_id = match value["data"]["id"].as_u64(){
      Some(nbr) => nbr,
      _ => return Err(anyhow!("Error from server, no data received")),
    };
    let receiver = enter_chat_room(location, player_id).await?;
    Ok((player_id, client, receiver))
}

async fn enter_chat_room(location: &String, id: u64) -> Result<mpsc::Receiver<serde_json::Value>> {
    let connector = Connector::NativeTls(
			native_tls::TlsConnector::builder()
				.danger_accept_invalid_certs(true)
				.build()?
		);

	let request = format!("wss://{}/api/chat?userid={}", location, id);
	let (ws_stream, _) = connect_async_tls_with_config(
			request,
			None,
			false,
			Some(connector),
			)
            .await?;

    let (sender, receiver): (mpsc::Sender<serde_json::Value>, mpsc::Receiver<serde_json::Value>)  = mpsc::channel(1024);
    tokio::spawn(async move {
        chat(ws_stream, sender).await.unwrap();
    });
    Ok(receiver)
}

async fn   chat(mut ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>>, sender: mpsc::Sender<serde_json::Value>) -> Result<()> {
    while let Some(msg) =  ws_stream.next().await {
        let bonjour = match msg {
            Ok(result) => match result {
                Message::Text(result) => result,
                _ => {continue;},
            },
            _ => {continue;},
        };
        let message: serde_json::Value = serde_json::from_str(bonjour.as_str())?;
        
        let _ = match message["gameId"].as_str() {
            Some(_) => {sender.send(message).await?},
            _ => {continue;}
        };
    }
    Ok(())
}

/*
Send message in 
Send -> JSON contenanet user name, message, isCmd

*/