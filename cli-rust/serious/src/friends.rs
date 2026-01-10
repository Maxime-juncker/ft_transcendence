use anyhow::{Result, anyhow};
use serde_json;
use crossterm::event::poll;
use crate::CurrentScreen;
use std::time::Duration;
use crossterm::event::{self, Event, KeyCode};
use std::collections::HashMap;
use super::{should_exit, Infos};
use crate::Context;
use crate::Auth;

#[derive(Default)]
pub struct Friends {
    auth: std::sync::Arc<Auth>,
    context: std::sync::Arc<Context>,
    screen: std::sync::Arc<tokio::sync::Mutex<CurrentScreen>>,
    index: usize,
    index_max: usize,
    friends: Vec<String>,
    friend_tmp: String,
    blink: bool,
}

impl Friends {
    async fn get_indexed_friends(&mut self) -> Result<()> {
        let friends = self.get_all_friends().await?;
        let mut printable: Vec<String> = vec![];
            let mut _str_tmp: String = String::new();
            for element in &friends[..] {
                    _str_tmp = element.0.clone();
                    if element.1 == false {
                        _str_tmp = _str_tmp + " (Pending)";
                    }
                printable.push(_str_tmp);
            }
        self.friends = printable;
        Ok(())
    }
    async fn add_friend(&mut self) -> Result<()> {
        if poll(Duration::from_millis(500))? == true {
            let event = event::read()?;
            if should_exit(&event)? {
                self.friend_tmp.clear();
                *self.screen.lock().await = CurrentScreen::FriendsDisplay;
            } else if let Event::Key(eventkey) = event {
            match eventkey.code {
                    KeyCode::Backspace => {self.friend_tmp.pop();},
                    KeyCode::Char(c) => {self.friend_tmp.push(c)},
                    KeyCode::Enter => {
                        self.send_friend_request().await?;
                        self.get_indexed_friends().await?;
                    },
                    _ => {},
                }
            }
        }
        self.tick();
        Ok(())
    }
    async fn delete_friend(&mut self) -> Result<()> {
        if poll(Duration::from_millis(500))? == true {
            let event = event::read()?;
            if should_exit(&event)? {
                self.friend_tmp.clear();
                *self.screen.lock().await = CurrentScreen::FriendsDisplay;
            } else if let Event::Key(eventkey) = event {
            match eventkey.code {
                    KeyCode::Backspace => {self.friend_tmp.pop();},
                    KeyCode::Char(c) => {self.friend_tmp.push(c)},
                    KeyCode::Enter => {
                        self.send_delete_friend_request().await?;
                        self.get_indexed_friends().await?;
                    },
                    _ => {},
                }
            }
        }
        self.tick();
        Ok(())
    }
    async fn send_friend_request(&mut self) -> Result<()> {
        let mut map = HashMap::new();
        map.insert("token", self.auth.get_token());
        let id = self.get_id().await?.to_string();
        map.insert("friend_id", &id);
        let url = format!("https://{}/api/friends/send_request", self.context.location);
        let response = self.context.client
            .post(url)
            .header("content-type", "application/json")
            .json(&map)
            .send()
            .await?;
        self.friend_tmp.clear();
        match response.status().as_u16() {
            200 => {*self.screen.lock().await = CurrentScreen::FriendsDisplay;},
            _ => {let message: serde_json::Value = response.json().await?;
                if let Some(error_message) = message["message"].as_str() {
                    return Err(anyhow!(error_message.to_string()));
                }
            },
        }
        Ok(())
    }
    async fn send_delete_friend_request(&mut self) -> Result<()> {
        let mut map = HashMap::new();
        map.insert("token", self.auth.get_token());
        let id = self.get_id().await?.to_string();
        map.insert("friend_id", &id);
        let url = format!("https://{}/api/friends/remove", self.context.location);
        let response = self.context.client
            .delete(url)
            .header("content-type", "application/json")
            .json(&map)
            .send()
            .await?;
        self.friend_tmp.clear();
        match response.status().as_u16() {
            200 => {*self.screen.lock().await = CurrentScreen::FriendsDisplay;},
            _ => {let message: serde_json::Value = response.json().await?;
                if let Some(message) = message["message"].as_str() {
                    return Err(anyhow!(message.to_string()));
                }
            },
        }
        Ok(())
    }
    async fn get_id(&self) -> Result<i64> {
        let result: i64;
        let apiloc = format!("https://{}/api/user/get_profile_name?profile_name={}", self.context.location, self.friend_tmp);
        let response = self.context.client
            .get(apiloc)
            .send()
            .await?;
        let response: serde_json::Value = response.json().await?;
        match response["id"].as_i64() {
            Some(id) => result = id,
            _ => {return Err(anyhow!("Friend not found"))}
        }
        Ok(result)
    }
    async fn get_all_friends(&self) -> Result<Vec<(String, bool)>> {
        let url = format!("https://{}/api/friends/get?user_id={}", self.context.location, self.auth.id);
        let response = self.context.client
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
                        _ => {return Err(anyhow!("empty array"));}
                    };
                    for object in response_array {
                        let map = match object.as_object() {
                            Some(map) => map,
                            _ => {continue;},
                        };
                        let name = Self::look_for_name2(&self, object).await?;
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
                }

            },
            404 => {eprintln!("No friends found :(");},
            _ => {eprintln!("Error from server :(");}
        }
        Ok(result)
    }
    async fn look_for_name2(&self, object: &serde_json::Value) -> Result<String> {
        let id_to_find = match object["user1_id"].as_u64() {
            Some(user1) => {
                if user1 != self.auth.id {
                user1
                } else {
                    let user2 = match object["user2_id"].as_u64() {
                        Some(user2) => {
                            if user2 != self.auth.id {
                                user2
                            } else {
                                return Err(anyhow!("from user ids"));
                            }
                        }
                        _ => {return Err(anyhow!("from user ids"));}
                    };
                    user2
                }
            },
            _ => {return Err(anyhow!("from user ids"));}
        };
        
        let url = format!("https://{}/api/user/get_profile_id?user_id={}", self.context.location, id_to_find);
        let response = self.context.client
            .get(url)
            .send()
            .await?;
        match response.status().as_u16() {
            200 => {
                let body: serde_json::Value = response.json().await?;
                match body["name"].as_str() {
                    Some(name) => {return Ok(name.to_string());},
                    _ => {return Err(anyhow!("No name in "))}
                }
            },
            _ => {return Err(anyhow!("Error"));},
        }
    }
    pub fn tick(&mut self) {
        self.blink = !self.blink;
    }
}




pub trait FriendsDisplay {
    async fn get_indexed_friends(&mut self) -> Result<()>;
    async fn add_friend(&mut self) -> Result<()>;
    async fn delete_friend(&mut self) -> Result<()>;
    async fn send_friend_request(&mut self) -> Result<()>;
    async fn send_delete_friend_request(&mut self) -> Result<()>;
    async fn get_id(&self) -> Result<i64>;
    async fn get_all_friends(&self) -> Result<Vec<(String, bool)>>;
}

impl FriendsDisplay for Infos  {
    async fn get_indexed_friends(&mut self) -> Result<()> {
        let friends = self.get_all_friends().await?;
        let mut printable: Vec<String> = vec![];
            let mut _str_tmp: String = String::new();
            for element in &friends[..] {
                    _str_tmp = element.0.clone();
                    if element.1 == false {
                        _str_tmp = _str_tmp + " (Pending)";
                    }
                printable.push(_str_tmp);
            }
        self.friends = printable;
        Ok(())
    }
    async fn add_friend(&mut self) -> Result<()> {
        if poll(Duration::from_millis(500))? == true {
            let event = event::read()?;
            if should_exit(&event)? {
                self.friend_tmp.clear();
                self.screen = CurrentScreen::FriendsDisplay;
            } else if let Event::Key(eventkey) = event {
            match eventkey.code {
                    KeyCode::Backspace => {self.friend_tmp.pop();},
                    KeyCode::Char(c) => {self.friend_tmp.push(c)},
                    KeyCode::Enter => {
                        self.send_friend_request().await?;
                        self.get_indexed_friends().await?;
                    },
                    _ => {},
                }
            }
        }
        self.auth.tick();
        Ok(())
    }
    async fn delete_friend(&mut self) -> Result<()> {
        if poll(Duration::from_millis(500))? == true {
            let event = event::read()?;
            if should_exit(&event)? {
                self.friend_tmp.clear();
                self.screen = CurrentScreen::FriendsDisplay;
            } else if let Event::Key(eventkey) = event {
            match eventkey.code {
                    KeyCode::Backspace => {self.friend_tmp.pop();},
                    KeyCode::Char(c) => {self.friend_tmp.push(c)},
                    KeyCode::Enter => {
                        self.send_delete_friend_request().await?;
                        self.get_indexed_friends().await?;
                    },
                    _ => {},
                }
            }
        }
        self.auth.tick();
        Ok(())
    }
    async fn send_friend_request(&mut self) -> Result<()> {
        let mut map = HashMap::new();
        map.insert("token", self.auth.get_token());
        let id = self.get_id().await?.to_string();
        map.insert("friend_id", &id);
        let url = format!("https://{}/api/friends/send_request", self.context.location);
        let response = self.client
            .post(url)
            .header("content-type", "application/json")
            .json(&map)
            .send()
            .await?;
        self.friend_tmp.clear();
        match response.status().as_u16() {
            200 => {self.screen = CurrentScreen::FriendsDisplay;},
            _ => {let message: serde_json::Value = response.json().await?;
                if let Some(message) = message["message"].as_str() {
                    self.error(message.to_string());
                }
            },
        }
        Ok(())
    }
    async fn send_delete_friend_request(&mut self) -> Result<()> {
        let mut map = HashMap::new();
        map.insert("token", self.auth.get_token());
        let id = self.get_id().await?.to_string();
        map.insert("friend_id", &id);
        let url = format!("https://{}/api/friends/remove", self.location);
        let response = self.client
            .delete(url)
            .header("content-type", "application/json")
            .json(&map)
            .send()
            .await?;
        self.friend_tmp.clear();
        match response.status().as_u16() {
            200 => {self.screen = CurrentScreen::FriendsDisplay;},
            _ => {let message: serde_json::Value = response.json().await?;
                if let Some(message) = message["message"].as_str() {
                    self.error(message.to_string());
                }
            },
        }
        Ok(())
    }
    async fn get_id(&self) -> Result<i64> {
        let result: i64;
        let apiloc = format!("https://{}/api/user/get_profile_name?profile_name={}", self.location, self.friend_tmp);
        let response = self.client
            .get(apiloc)
            .send()
            .await?;
        let response: serde_json::Value = response.json().await?;
        match response["id"].as_i64() {
            Some(id) => result = id,
            _ => {return Err(anyhow!("Friend not found"))}
        }
        Ok(result)
    }
    async fn get_all_friends(&self) -> Result<Vec<(String, bool)>> {
        let url = format!("https://{}/api/friends/get?user_id={}", self.location, self.id);
        let response = self.client
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
                        _ => {return Err(anyhow!("empty array"));}
                    };
                    for object in response_array {
                        let map = match object.as_object() {
                            Some(map) => map,
                            _ => {continue;},
                        };
                        let name = look_for_name(&self, object).await?;
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
                }

            },
            404 => {eprintln!("No friends found :(");},
            _ => {eprintln!("Error from server :(");}
        }
        Ok(result)
    }
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
                            return Err(anyhow!("from user ids"));
                        }
                    }
                    _ => {return Err(anyhow!("from user ids"));}
                };
                user2
            }
        },
        _ => {return Err(anyhow!("from user ids"));}
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
                _ => {return Err(anyhow!("No name in "))}
            }
        },
        _ => {return Err(anyhow!("Error"));},
    }
}