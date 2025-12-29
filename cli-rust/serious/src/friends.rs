use std::{
  io::{Write, stdout},
};

use anyhow::{Result, anyhow};
use serde_json;
use crossterm::event::poll;
use reqwest::{Client};
use tokio_tungstenite::tungstenite::protocol::frame;

use crate::infos_events::EventHandler;
use crate::screen_displays::ScreenDisplayer;
use crate::welcome::{draw_welcome_screen, game_setup, setup_terminal};
// use crate::game::{create_game};
// use crate::friends::social_life;

use crate::login::{create_guest_session};
use tokio::{net::unix::pipe::Receiver, sync::mpsc};

use std::time::Duration;
use crossterm::{
  ExecutableCommand, QueueableCommand, cursor::{self, SetCursorStyle}, event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, PopKeyboardEnhancementFlags}, style::*, terminal
};

use crate::LOGO;
use super::{should_exit, Infos};

use ratatui::{
    text::Span,
    buffer::Buffer,
    layout::Rect,
    style::Stylize,
    symbols::border,
    text::{Line, Text},
    widgets::{Block, Paragraph, Widget},
    DefaultTerminal, Frame,
};

pub const WIDTH: u16 = 90;
pub const HEIGHT: u16 = 30;

pub trait FriendsDisplay {
    async fn get_indexed_friends(&self) -> Result<Vec<String>>;
    // fn print_friends(&self, area: Rect, buf: &mut Buffer, friends: &Vec<(String, bool)>) -> Result<Vec<String>>;
}

impl FriendsDisplay for Infos  {
    async fn get_indexed_friends(&self) -> Result<Vec<String>> {
        let friends = get_all_friends(&self).await?;
        let mut printable: Vec<String> = vec![];
        let mut i: usize = 0;
        if self.index * 10 < friends.len() {
            let mut str_tmp: String = String::new();
            for element in &friends[self.index * 10..] {
                if (self.index * 10 + i) as usize > friends.len() || i > 9 {
                    break;
                } else {
                    str_tmp = element.0.clone();
                    if element.1 == false {
                        str_tmp = str_tmp + " (Pending)";
                    }
                }
                printable.push(str_tmp);
                i += 1;
            }
        }
        if i == 10 && friends.len() > self.index * 10 + i {
            printable.push("...".to_string());
        }
        Ok(printable)
        // loop {
        //     if (poll(Duration::from_millis(16)))? {
        //         let event: Event = event::read()?;
        
        //         if (should_exit(&event))? == true {
        //             return Ok(());
        //         }
        //         else if let Event::Key(key_event) = event {
        //             match key_event.code {
        //                 // KeyCode::Char('1') => {add_friend(self).await?},
        //                 // KeyCode::Char('1') => {add_friend(self).await?},
        //                 // KeyCode::Char('2') => {delete_friend(self).await?},
        //                 // KeyCode::Char('2') => {delete_friend(self).await?},
        //                 KeyCode::Char('3') => {},
        //                 KeyCode::Right => {
        //                     if index < usize::MAX {
        //                         index += 1;
        //                     }
        //                 },
        //                 KeyCode::Left => {if index > 0 {
        //                     index -= 1;
        //                 }
        //                 },
        //                 _ => {},
        //             }
        //         }
        //     }
        // }
    }
    // fn print_friends(&self, area: Rect, buf: &mut Buffer, friends: &Vec<(String, bool)>) -> Result<Vec<String>> {
    //     let mut printable: Vec<String> = vec![];
    //     let mut i: usize = 0;
    //     if self.index * 10 < friends.len() {
    //         let mut str_tmp: String = String::new();
    //         for element in &friends[self.index * 10..] {
    //             if (self.index * 10 + i) as usize > friends.len() || i > 9 {
    //                 break;
    //             } else {
    //                 str_tmp = element.0.clone();
    //                 if element.1 == false {
    //                     str_tmp = str_tmp + " (Pending)";
    //                 }
    //             }
    //             printable.push(str_tmp);
    //             i += 1;
    //         }
    //     }
    //     if i == 10 && friends.len() > self.index * 10 + i {
    //         printable.push("...".to_string());
    //         // stdout()
    //         //     .queue(cursor::MoveTo(4, 24))?
    //         //     .queue(Print("..."))?;

    //     }


    //     // let menu = format!("Menu: 1. ADD   2. DELETE   3. DM   {} Previous   {} Next    ESC. Back", '←', '→');
    //     // stdout()
    //     //     .queue(cursor::MoveTo(2, HEIGHT - 1))?
    //     //     .queue(Print(menu))?;
    //     // stdout().flush()?;
    //     Ok(printable)
    // }
        
}

async fn get_all_friends(game_main: &Infos) -> Result<Vec<(String, bool)>> {
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



// async fn delete_friend(game_main: &Infos) -> Result<()> {
//     set_display_friend_adding()?;
//     let mut friend_name = String::new();
//     loop {
//         let event = event::read()?;
        
//         if should_exit(&event)? == true {
//             stdout().execute(Hide)?;
//             return Ok(());
//         }
//         else if let Event::Key(key_event) = event {
//             match key_event.code {
//                 KeyCode::Char(c) => {
//                     let (x, _) = position()?;
//                     if x < WIDTH - 1 {
//                         stdout().execute(Print(c))?;
//                         friend_name.push(c);
//                     }
//                 }
//                 KeyCode::Backspace => {
//                     let (x, _) = position()?;
//                     if x > 19 {
//                         stdout()
//                             .queue(MoveLeft(1))?
//                             .queue(Print(" "))?
//                             .queue(MoveLeft(1))?;
//                         stdout().flush()?;
//                         friend_name.pop();
//                     }
//                 }
//                 KeyCode::Enter => {
//                     stdout().execute(Hide)?;
//                     break;
//                 },
//                 _ => {}
//             }
//         }
//     } 
//     send_delete_request(game_main, friend_name).await?;
//     Ok(())
// }

// async fn add_friend(game_main: &Infos) -> Result<()> {
//     set_display_friend_adding()?;
//     let mut friend_name = String::new();
//     loop {
//         let event = event::read()?;
        
//         if should_exit(&event)? == true {
//             stdout().execute(Hide)?;
//             return Ok(());
//         }
//         else if let Event::Key(key_event) = event {
//             match key_event.code {
//                 KeyCode::Char(c) => {
//                     let (x, _) = position()?;
//                     if x < WIDTH - 1 {
//                         stdout().execute(Print(c))?;
//                         friend_name.push(c);
//                     }
//                 }
//                 KeyCode::Backspace => {
//                     let (x, _) = position()?;
//                     if x > 19 {
//                         stdout()
//                             .queue(MoveLeft(1))?
//                             .queue(Print(" "))?
//                             .queue(MoveLeft(1))?;
//                         stdout().flush()?;
//                         friend_name.pop();
//                     }
//                 }
//                 KeyCode::Enter => {
//                     stdout().execute(Hide)?;
//                     break;
//                 },
//                 _ => {}
//             }
//         }
//     }
//     send_friend_request(game_main, friend_name).await?;
//     Ok(())
// }

// async fn send_delete_request(game_main: &Infos, friend_name: String) -> Result<()> {
//     let url = format!("https://{}/api/user/get_profile_name?profile_name={}", game_main.location, friend_name);
//     let response = game_main.client
//         .get(url)
//         .send()
//         .await?;
//     stdout()
//         .queue(MoveTo(2, HEIGHT - 1))?
//         .queue(Print("                                                                                    "))?
//         .queue(MoveTo(2, HEIGHT - 1))?;
//     stdout().flush()?;
//     match response.status().as_u16() {
//         200 => {
//             let body: serde_json::Value = response.json().await?;
//             let id = match body["id"].as_u64() {
//                 Some(id) => id,
//                 _ => {
//                     stdout().execute(Print("Error, friend does not exist"))?;
//                     return Ok(());
//                 }
//             };
//             let url = format!("https://{}/api/friends/remove/{}/{}", game_main.location, id, game_main.id);
//             match game_main.client
//                 .delete(url)
//                 .send()
//                 .await?
//                 .status()
//                 .as_u16() {
//                     200 => {stdout().execute(Print(format!("{} successfully deleted", friend_name)))?;},
//                     404 => {stdout().execute(Print("You are not friend with friend"))?;},
//                     _ => {stdout().execute(Print("Error deleting friend: Server Error"))?;}
//                 }
//         },
//         404 => {stdout().execute(Print("Error, friend does not exist"))?;},
//         _ => {stdout().execute(Print("Error adding friend: Server error"))?;}
//     }
//     sleep(Duration::from_secs(2));
//     Ok(())
// }

// async fn send_friend_request(game_main: &Infos, friend_name: String) -> Result<()> {
//     let mut map = HashMap::new();
//     map.insert("user_id", game_main.id.to_string());
//     map.insert("friend_name", friend_name);
//     let url = format!("https://{}/api/friends/send_request", game_main.location);
//     let response = game_main.client
//         .post(url)
//         .json(&map)
//         .send()
//         .await?;
    
//     stdout()
//         .queue(MoveTo(2, HEIGHT - 1))?
//         .queue(Print("                                                                                    "))?
//         .queue(MoveTo(2, HEIGHT - 1))?;
//     match response.status().as_u16() {
//         200 => {stdout().queue(Print("Friend request sent!"))?;},
//         404 => {stdout().queue(Print("Error, friend does not exist"))?;},
//         _ => {stdout().queue(Print("Error adding friend: Server error"))?;}
//     }
//     stdout().flush()?;
//     sleep(Duration::from_secs(1));
//     Ok(())
// }

// fn set_display_friend_adding() -> Result<()> {
//     stdout()
//         .queue(cursor::MoveTo(2, HEIGHT - 1))?
//         .queue(Print("                                                                   "))?
//         .queue(cursor::MoveTo(2, HEIGHT - 1))?
//         .queue(Print("friend username: "))?
//         .queue(Show)?
//         .queue(SetCursorStyle::BlinkingUnderScore)?;
//     stdout().flush()?;
    
//     Ok(())
// }





/*
ce que je veux: 
un menu avec 1. your friends
2. chat

MANAGE FRIENDS: 
--> See list of friends, type 1 to add, 2 to delete, 3 to dm, left if possible to go left, right to go right
LIST of friends : Menu en bas, sinon amis listés en deux colonnes



*/


// fn print_friends(&self, area: Rect, buf: &mut Buffer, friends: &Vec<(String, bool)>, index: &usize) -> Result<()> {
//     // stdout().execute(terminal::Clear(terminal::ClearType::All))?;
//     // borders()?;
//     // stdout()
//     //     .queue(cursor::MoveTo(WIDTH / 2 - 10, 2))?
//     //     .queue(Print("Your friends list"))?;
//     let mut printable: Vec<String> = vec![];
//     let mut i: usize = 0;
//     if index * 10 < friends.len() {
//         let mut str_tmp: String = String::new();
//         for element in &friends[index * 10..] {
//             if (index * 10 + i) as usize > friends.len() || i > 9 {
//                 break;
//             } else {
//                 str_tmp = element.0;
//                 // stdout()
//                 //     .queue(cursor::MoveTo(4, (i * 2 + 4) as u16))?
//                 //     .queue(Print(&element.0))?;
//                 if element.1 == false {
//                     // stdout()
//                     //     .queue(Print(" (Pending)"))?;
//                     str_tmp = str_tmp + " (Pending)";
//                 }
//             }
//             i += 1;
//         }
//     }
//     // if i == 10 && friends.len() > index * 10 + i {
//     //     stdout()
//     //         .queue(cursor::MoveTo(4, 24))?
//     //         .queue(Print("..."))?;
//     // }
//     // let menu = format!("Menu: 1. ADD   2. DELETE   3. DM   {} Previous   {} Next    ESC. Back", '←', '→');
//     // stdout()
//     //     .queue(cursor::MoveTo(2, HEIGHT - 1))?
//     //     .queue(Print(menu))?;
//     // stdout().flush()?;
//     Ok(())
// }