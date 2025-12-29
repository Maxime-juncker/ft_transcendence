use std::{
  io::{Write, stdout},
};

use anyhow::{Result, anyhow};
use serde_json;

use reqwest::{Client};
use tokio_tungstenite::tungstenite::protocol::frame;

use crate::welcome::{draw_welcome_screen, game_setup, setup_terminal};
// use crate::game::{create_game};
// use crate::friends::social_life;

use crate::login::{create_guest_session};
use tokio::{net::unix::pipe::Receiver, sync::mpsc};

use crossterm::{
  ExecutableCommand, QueueableCommand, cursor::{self, SetCursorStyle}, event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, PopKeyboardEnhancementFlags}, style::*, terminal
};

use crate::LOGO;
use crate::CurrentScreen;
use crate::friends::FriendsDisplay;
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

use super::{Infos, should_exit};

pub trait EventHandler {
    fn handle_welcome_events(self) -> Result<Infos>;
    fn handle_gamechoice_events(self) -> Result<Infos>;
    async fn handle_social_events(self) -> Result<Infos>;
    fn handle_login_events(self) -> Result<Infos>;
}

impl EventHandler for Infos {
    fn handle_welcome_events(mut self) -> Result<Infos> {
      let event = event::read()?;
      if should_exit(&event)? == true {
        self.exit = true;
      }
      else if let Event::Key(key_event) = event {
        if key_event.kind == KeyEventKind::Press {
            match key_event.code {
                KeyCode::Char('1') => {self.screen = CurrentScreen::GameChoice;},
                KeyCode::Char('2') => {self.screen = CurrentScreen::SocialLife;},
                _ => {},
            }
        }
      }
      Ok(self)
    }
    fn handle_gamechoice_events(mut self) -> Result<Infos> {
      let event = event::read()?;
      if should_exit(&event)? == true {
        self.exit = true;
      }
      else if let Event::Key(key_event) = event {
        if key_event.kind == KeyEventKind::Press {
            match key_event.code {
                // KeyCode::Char('1') => {self.screen = CurrentScreen::GameChoice;},
                KeyCode::Char('2') => {self.screen = CurrentScreen::CreateGame;},
                KeyCode::Char('4') => {self.screen = CurrentScreen::Welcome;},
                _ => {},
            }
        }
      }
      Ok(self)
    }
    fn handle_login_events(mut self) -> Result<Infos> {
      let event = event::read()?;
      if should_exit(&event)? == true {
        self.exit = true;
      }
      else if let Event::Key(key_event) = event {
        if key_event.kind == KeyEventKind::Press {
            match key_event.code {
                KeyCode::Char('1') => {self.screen = CurrentScreen::GameChoice;},
                KeyCode::Char('2') => {self.screen = CurrentScreen::CreateGame;},
                KeyCode::Char('3') => {self.screen = CurrentScreen::Welcome;},
                _ => {},
            }
        }
      }
      Ok(self)
    }
    async fn handle_social_events(mut self) -> Result<Infos> {
        let event = event::read()?;

        if should_exit(&event)? == true {
            self.exit = true;
        }
        else if let Event::Key(key_event) = event {
            match key_event.code {
            // KeyCode::Char('1') => {display_friends(game_main).await?;},
            KeyCode::Char('1') => {
              let mut list: Vec<String> = self.get_indexed_friends().await?;
              list.push("test".to_string());
              self.friends = list;              
              self.screen = CurrentScreen::FriendsDisplay
            },
            KeyCode::Char('2') => {
                //chat();
            },
            KeyCode::Char('3') => {self.screen = CurrentScreen::Welcome},
            _ => {},
            }
        }
        Ok(self) 
    }
}