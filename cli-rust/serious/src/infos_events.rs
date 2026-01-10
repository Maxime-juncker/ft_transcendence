use std::{
  time::Duration,
};

use anyhow::Result;

use crate::{login::Authentify};

use crossterm::event::{self, poll, Event, KeyCode, KeyEventKind};
use crate::login::Field;
use crate::CurrentScreen;
use crate::friends::FriendsDisplay;

use super::{Infos, should_exit};

pub trait EventHandler {
    fn handle_welcome_events(&mut self) -> Result<()>;
    fn handle_gamechoice_events(&mut self) -> Result<()>;
    fn handle_friends_events(&mut self) -> Result<()>;
    async fn handle_social_events(&mut self) -> Result<()>;
    async fn handle_first_events(&mut self) -> Result<()>;
    async fn handle_signup_events(&mut self) -> Result<()>;
    async fn handle_login_events(&mut self) -> Result<()>;
}

impl EventHandler for Infos {
  fn handle_welcome_events(&mut self) -> Result<()> {
    let event = event::read()?;
    if should_exit(&event)? == true {
      self.exit = true;
    }
    else if let Event::Key(key_event) = event {
      if key_event.kind == KeyEventKind::Press {
        match key_event.code {
            KeyCode::Up => {self.screen = CurrentScreen::GameChoice;},
            KeyCode::Right => {self.screen = CurrentScreen::SocialLife;},
            _ => {},
        }
      }
    }
    Ok(())
  }
  fn handle_gamechoice_events(&mut self) -> Result<()> {
    let event = event::read()?;
    if should_exit(&event)? == true {
      self.exit = true;
    }
    else if let Event::Key(key_event) = event {
      if key_event.kind == KeyEventKind::Press {
          match key_event.code {
              KeyCode::Right => {self.screen = CurrentScreen::CreateGame;},
              KeyCode::Left => {self.screen = CurrentScreen::Welcome;},
              _ => {},
          }
      }
    }
    Ok(())
  }
  async fn handle_first_events(&mut self) -> Result<()> {
    let event = event::read()?;
    if should_exit(&event)? == true {
      self.exit = true;
    }
    else if let Event::Key(key_event) = event {
      if key_event.kind == KeyEventKind::Press {
          match key_event.code {
              KeyCode::Up => {self.screen = CurrentScreen::SignUp;},
              KeyCode::Down => {self.screen = CurrentScreen::Login;},
              KeyCode::Right => {
                self.auth.create_guest_session().await?;
                self.screen = CurrentScreen::Welcome;
              },
              _ => {},
          }
      }
    }
    Ok(())
  }
  async fn handle_social_events(&mut self) -> Result<()> {
    self.get_indexed_friends().await?;
    let event = event::read()?;
    if should_exit(&event)? == true {
        self.exit = true;
    }
    else if let Event::Key(key_event) = event {
      match key_event.code {
        KeyCode::Right => {
          self.screen = CurrentScreen::FriendsDisplay
        },
        KeyCode::Left => {self.screen = CurrentScreen::Welcome},
        _ => {},
      }
    }
    Ok(()) 
  }
  async fn handle_signup_events(&mut self) -> Result<()> {
      if poll(Duration::from_millis(500))? == true {
        let event = event::read()?;
        if should_exit(&event)? {
          self.auth.clear();
          self.screen = CurrentScreen::FirstScreen;
        } else if let Event::Key(eventkey) = event {
          match eventkey.code {
            KeyCode::Up => {self.auth.up_field_signup()},
            KeyCode::Down => {self.auth.down_field_signup()},
            KeyCode::Char(c) => {self.auth.add(c)},
            KeyCode::Backspace => {self.auth.pop()},
            KeyCode::Tab => {self.auth.down_field_signup()}
            KeyCode::Enter => {if *self.auth.get_field() == Field::Password {
              self.auth.signup().await?;
              self.screen = CurrentScreen::Welcome;
            } else {self.auth.down_field_signup()}} 
            _ => {},
          }
        }
      }
      self.auth.tick();
      Ok(())
  }
  async fn handle_login_events(&mut self) -> Result<()> {
      if poll(Duration::from_millis(500))? == true {
        let event = event::read()?;
        if should_exit(&event)? {
          self.auth.clear();
          self.screen = CurrentScreen::FirstScreen;
        } else if let Event::Key(eventkey) = event {
          match eventkey.code {
            KeyCode::Up => {self.auth.up_field_login()},
            KeyCode::Down => {self.auth.down_field_login()},
            KeyCode::Char(c) => {self.auth.add(c)},
            KeyCode::Backspace => {self.auth.pop();},
            KeyCode::Tab => {self.auth.down_field_login()},
            KeyCode::Enter => {if *self.auth.get_field() == Field::Totp {
              self.auth.login().await?;
              self.screen = CurrentScreen::Welcome;
              } else {
              self.auth.down_field_login()
              }
            }  
            _ => {},
          }
        }
      }
      self.auth.tick();
      Ok(())
  }
  fn handle_friends_events(&mut self) -> Result<()> {
      let event = event::read()?;
      if should_exit(&event)? == true {
        self.screen = CurrentScreen::SocialLife      
      }
      else if let Event::Key(key_event) = event {
          match key_event.code {
          KeyCode::Up => {
            self.screen = CurrentScreen::AddFriend
          },
          KeyCode::Down => {
            self.screen = CurrentScreen::DeleteFriend
          },
          KeyCode::Right => {if self.index < self.index_max {self.index += 1}},
          KeyCode::Left => {if self.index > usize::MIN {self.index -= 1}},
          _ => {},
          }
      }
      else if let Event::Resize(_, _) = event {
        self.index = 0;
      }
      Ok(())
  }
}