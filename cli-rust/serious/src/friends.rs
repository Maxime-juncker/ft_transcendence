use reqwest::{
	header::HeaderMap,
	Client,
};

use crossterm::{
    ExecutableCommand, QueueableCommand, cursor::{self, EnableBlinking, Hide, MoveLeft, MoveTo, SetCursorStyle, Show, position}, event::{self, EnableMouseCapture, Event, KeyCode, KeyEvent, KeyEventKind, poll}, style::*, terminal
};

use futures_util::{StreamExt, SinkExt};
use futures_util::stream::SplitSink;
use serde_json::Number;
use ::terminal::Terminal;
use std::time::Duration;
use std::{
	collections::HashMap,
	io::{Write, stdout},
};

use crate::{game, welcome::{NUM_COLS, NUM_ROWS, borders}};



use crate::{should_exit, cleanup_and_quit};
use bytes::Bytes;

use tokio_tungstenite::{connect_async_tls_with_config, tungstenite::{Utf8Bytes, http::response}};
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::Connector;
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use std::thread::{sleep};

use anyhow::{Result, anyhow};

use crate::Infos;

use tokio::{runtime::TryCurrentError, sync::mpsc};
use tokio::net::TcpStream;

use crate::welcome::draw_friends_screen;

pub async fn social_life(game_main: &Infos) -> Result<()> {
    loop {
        draw_friends_screen()?;
        let event = event::read()?;

        if should_exit(&event)? == true {
            cleanup_and_quit(&game_main.original_size)?;
        }
        else if let Event::Key(key_event) = event {
            match key_event.code {
            KeyCode::Char('1') => {
                display_friends(game_main).await?;
            },
            KeyCode::Char('2') => {
                //chat();
            },
            KeyCode::Char('3') => {break Ok(());},
            _ => {},
            }
        }
    }
}

async fn display_friends(game_main: &Infos) -> Result<()> {
    let mut index: usize = 0;
    loop {
        let friends_list = get_friends(game_main).await?;
        print_friends(&friends_list, &index)?;
        let event: Event = event::read()?;

        if (should_exit(&event))? == true {
            return Ok(());
        }
        else if let Event::Key(key_event) = event {
            match key_event.code {
                KeyCode::Char('1') => {add_friend(game_main).await?},
                KeyCode::Char('2') => {delete_friend(game_main).await?},
                KeyCode::Char('3') => {},
                KeyCode::Right => {
                    if index < usize::MAX {
                        index += 1;
                    }
                },
                KeyCode::Left => {if index > 0 {
                    index -= 1;
                   }
                },
                _ => {},
            }
        }
    }
}

async fn delete_friend(game_main: &Infos) -> Result<()> {
    set_display_friend_adding()?;
    let mut friend_name = String::new();
    loop {
        let event = event::read()?;
        
        if should_exit(&event)? == true {
            stdout().execute(Hide)?;
            return Ok(());
        }
        else if let Event::Key(key_event) = event {
            match key_event.code {
                KeyCode::Char(c) => {
                    let (x, _) = position()?;
                    if x < NUM_ROWS - 1 {
                        stdout().execute(Print(c))?;
                        friend_name.push(c);
                    }
                }
                KeyCode::Backspace => {
                    let (x, _) = position()?;
                    if x > 19 {
                        stdout()
                            .queue(MoveLeft(1))?
                            .queue(Print(" "))?
                            .queue(MoveLeft(1))?;
                        stdout().flush()?;
                        friend_name.pop();
                    }
                }
                KeyCode::Enter => {
                    stdout().execute(Hide)?;
                    break;
                },
                _ => {}
            }
        }
    } 
    send_delete_request(game_main, friend_name).await?;
    Ok(())
}

async fn add_friend(game_main: &Infos) -> Result<()> {
    set_display_friend_adding()?;
    let mut friend_name = String::new();
    loop {
        let event = event::read()?;
        
        if should_exit(&event)? == true {
            stdout().execute(Hide)?;
            return Ok(());
        }
        else if let Event::Key(key_event) = event {
            match key_event.code {
                KeyCode::Char(c) => {
                    let (x, _) = position()?;
                    if x < NUM_ROWS - 1 {
                        stdout().execute(Print(c))?;
                        friend_name.push(c);
                    }
                }
                KeyCode::Backspace => {
                    let (x, _) = position()?;
                    if x > 19 {
                        stdout()
                            .queue(MoveLeft(1))?
                            .queue(Print(" "))?
                            .queue(MoveLeft(1))?;
                        stdout().flush()?;
                        friend_name.pop();
                    }
                }
                KeyCode::Enter => {
                    stdout().execute(Hide)?;
                    break;
                },
                _ => {}
            }
        }
    }
    send_friend_request(game_main, friend_name).await?;
    Ok(())
}

async fn send_delete_request(game_main: &Infos, friend_name: String) -> Result<()> {
    let url = format!("https://{}/api/user/get_profile_name?profile_name={}", game_main.location, friend_name);
    let response = game_main.client
        .get(url)
        .send()
        .await?;
    match response.status().as_u16() {
        200 => {
            let body: serde_json::Value = response.json().await?;
            let id = match body["id"].as_u64() {
                Some(id) => id,
                _ => {
                    stdout().execute(Print("Error, friend does not exist"))?;
                    // sleep(Duration::from_secs(2));
                    return Ok(());
                }
            };
            let url = format!("https://{}/api/friends/remove/{}/{}", game_main.location, id, game_main.id);
            match game_main.client
                .delete(url)
                .send()
                .await?
                .status()
                .as_u16() {
                    200 => {stdout().execute(Print("Friend successfully deleted"))?;},
                    404 => {stdout().execute(Print("Failed to delete friend"))?;},
                    _ => {stdout().execute(Print("Error deleting friend: Server Error"))?;}
                }
        },
        404 => {stdout().execute(Print("Error, friend does not exist"))?;},
        _ => {stdout().execute(Print("Error adding friend: Server error"))?;}
    }
    Ok(())
}

async fn send_friend_request(game_main: &Infos, friend_name: String) -> Result<()> {
    let mut map = HashMap::new();
    map.insert("user_id", game_main.id.to_string());
    map.insert("friend_name", friend_name);
    let url = format!("https://{}/api/friends/send_request", game_main.location);
    let response = game_main.client
        .post(url)
        .json(&map)
        .send()
        .await?;
    
    stdout()
        .queue(MoveTo(2, NUM_COLS - 1))?
        .queue(Print("                                                                                    "))?
        .queue(MoveTo(2, NUM_COLS - 1))?;
    match response.status().as_u16() {
        200 => {stdout().queue(Print("Friend request sent!"))?;},
        404 => {stdout().queue(Print("Error, friend does not exist"))?;},
        _ => {stdout().queue(Print("Error adding friend: Server error"))?;}
    }
    stdout().flush()?;
    // sleep(Duration::from_secs(1));
    Ok(())
}

fn set_display_friend_adding() -> Result<()> {
    stdout()
        .queue(cursor::MoveTo(2, NUM_COLS - 1))?
        .queue(Print("                                                                   "))?
        .queue(cursor::MoveTo(2, NUM_COLS - 1))?
        .queue(Print("friend username: "))?
        .queue(Show)?
        .queue(SetCursorStyle::BlinkingUnderScore)?;
    stdout().flush()?;
    
    Ok(())
}

async fn get_friends(game_main: &Infos) -> Result<Vec<(String, bool)>> {
    let url = format!("https://{}/api/friends/get?user_id={}", game_main.location, game_main.id);
    let response = game_main.client
        .get(url)
        .send()
        .await?;
    let mut result: Vec<(String, bool)> = vec![];
    match response.status().as_u16() {
        200 => {
            let response_array: serde_json::Value = response.json().await?;
            if response_array.is_array() {
                let response_array = match response_array.as_array() {
                    Some(array) => array,
                    _ => {return Err(anyhow::anyhow!("empty array"));}
                };
                for object in response_array {
                    let map = match object.as_object() {
                        Some(map) => map,
                        _ => {continue;},
                    };
                    let name = look_for_name(game_main, object).await?;
                    match map["pending"].as_u64() {
                    Some(0) => {
                        result.push((name, true));
                    }
                    Some(1) => {
                        result.push((name, false));
                    },
                    _ => {}, 
                    }
                    
                }
                // sleep(Duration::from_secs(3));
            }

        },
        404 => {eprintln!("No friends found :(");},
        _ => {eprintln!("Error from server :(");}
    }
    Ok(result)
}

async fn look_for_name(game_main: &Infos, object: &serde_json::Value) -> Result<String> {
    let id_to_find = match object["user1_id"].as_u64() {
        Some(user1) => {
            if user1 != game_main.id {
            user1
            } else {
                let user2 = match object["user2_id"].as_u64() {
                    Some(user2) => {
                        if user2 != game_main.id {
                            user2
                        } else {
                            return Err(anyhow::anyhow!("from user ids"));
                        }
                    }
                    _ => {return Err(anyhow::anyhow!("from user ids"));}
                };
                user2
            }
        },
        _ => {return Err(anyhow::anyhow!("from user ids"));}
    };
    
    let url = format!("https://{}/api/user/get_profile_id?user_id={}", game_main.location, id_to_find);
    let response = game_main.client
        .get(url)
        .send()
        .await?;
    match response.status().as_u16() {
        200 => {
            let body: serde_json::Value = response.json().await?;
            match body["name"].as_str() {
                Some(name) => {return Ok(name.to_string());},
                _ => {return Err(anyhow::anyhow!("No name in "))}
            }
        },
        _ => {return Err(anyhow::anyhow!("Error"));},
    }
}

fn print_friends(friends: &Vec<(String, bool)>, index: &usize) -> Result<()> {
    stdout().execute(terminal::Clear(terminal::ClearType::All))?;
    borders()?;
    stdout()
        .queue(cursor::MoveTo(NUM_ROWS / 2 - 10, 2))?
        .queue(Print("Your friends list"))?;
    let mut i: usize = 0;
    if index * 10 < friends.len(){
        for element in &friends[index * 10..] {
            if (index * 10 + i) as usize > friends.len() || i > 9 {
                break;
            } else {
                stdout()
                    .queue(cursor::MoveTo(4, (i * 2 + 4) as u16))?
                    .queue(Print(&element.0))?;
                if element.1 == false {
                    stdout()
                        .queue(Print(" (Pending)"))?;
                }
            }
            i += 1;
        }
    }
    if i == 10 && friends.len() > index * 10 + i {
        stdout()
            .queue(cursor::MoveTo(4, 24))?
            .queue(Print("..."))?;
    }
    let menu = format!("Menu: 1. ADD   2. DELETE   3. DM   {} Previous   {} Next    ESC. Back", '←', '→');
    stdout()
        .queue(cursor::MoveTo(2, NUM_COLS - 1))?
        .queue(Print(menu))?;
    stdout().flush()?;
    Ok(())
}




/*
ce que je veux: 
un menu avec 1. your friends
2. chat

MANAGE FRIENDS: 
--> See list of friends, type 1 to add, 2 to delete, 3 to dm, left if possible to go left, right to go right
LIST of friends : Menu en bas, sinon amis listés en deux colonnes



*/