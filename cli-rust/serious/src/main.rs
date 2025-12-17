use std::{
  io::{Write, stdout},
};

use anyhow::{Result, anyhow};
use serde_json;

use reqwest::{Client};
use tokio_tungstenite::tungstenite::protocol::frame;

mod welcome;
mod game;
mod friends;
mod infos_events;
mod screen_displays;

use crate::infos_events::EventHandler;
use crate::screen_displays::ScreenDisplayer;
use crate::welcome::{draw_welcome_screen, game_setup, setup_terminal};
use crate::game::{create_game};
// use crate::friends::social_life;

mod login;
use crate::login::{create_guest_session};
use tokio::{net::unix::pipe::Receiver, sync::mpsc};


use crossterm::{
  ExecutableCommand, QueueableCommand, cursor::{self, SetCursorStyle}, event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, PopKeyboardEnhancementFlags}, style::*, terminal
};

use welcome::LOGO;

use ratatui::{
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

// pub enum CurrentlyEditing {
//   Friend,
// }

pub enum CurrentScreen {
  Welcome,
  GameChoice,
  SocialLife,
  Game,
  FriendsDisplay,
}
pub struct Infos {
  original_size: (u16, u16),
  location: String,
  id: u64,
  client: Client,
  exit: bool,
  screen: CurrentScreen,
  index: usize,
}

#[tokio::main]
async fn main() -> Result<()> {
  // if let Err(e) = setup_terminal() {
  //   return Err(anyhow!("{}", e));
  // };
  let (original_size, location) = match get_infos_elements() {
    Ok(result) => result,
    Err(e) => {return Err(anyhow!("{}", e));},
  };
  let (num, client, receiver) = match create_guest_session(&location).await {
    Ok(res) => res,
    Err(e) => {
      clean_terminal(&original_size)?;
      return Err(anyhow!("{}", e));
    },
  };
  let game_main = Infos {original_size, location, id: num, client, exit: false, screen: CurrentScreen::Welcome, index: 0};
  let mut terminal = ratatui::init();
  let app_result = game_main.run(&mut terminal, receiver).await;
  ratatui::restore();
  app_result

  // if let Err(e) = welcome_screen(&game_main, receiver).await {
  //   clean_terminal(&game_main.original_size)?;
  //   return Err(anyhow!("{}", e));
  // };
  // cleanup_and_quit(&original_size)?;
  // Ok(())
}

impl Infos {
  pub async fn run(mut self, terminal: &mut DefaultTerminal, mut receiver: mpsc::Receiver<serde_json::Value>) -> Result<()> {
    while !self.exit {
      terminal.draw(|frame| self.draw(frame))?;
      (self, receiver) = self.handle_events(receiver).await?;
    }
    Ok(())
  }

  fn draw(&self, frame: &mut Frame) {
    frame.render_widget(self, frame.area());
  }

  async fn handle_events(mut self, mut receiver: mpsc::Receiver<serde_json::Value>) -> Result<(Infos, mpsc::Receiver<serde_json::Value>)> {
    match self.screen {
      CurrentScreen::Welcome => {self = self.handle_welcome_events()?},
      CurrentScreen::GameChoice => {self = self.handle_gamechoice_events()?},
      CurrentScreen::SocialLife => {self = self.handle_social_events()?},
      CurrentScreen::FriendsDisplay => {},
      CurrentScreen::Game => {},
    }
  Ok((self, receiver))
  }
}

impl Widget for &Infos {
  fn render(self, area: Rect, buf: &mut Buffer) {
    match self.screen {
      CurrentScreen::Welcome => {self.display_welcome_screen(area, buf);}, 
      CurrentScreen::GameChoice => {self.display_gamechoice_screen(area, buf);}, 
      CurrentScreen::SocialLife => {self.display_social_screen(area, buf);}, 
      CurrentScreen::FriendsDisplay => {self.display_friends_screen(area, buf);}, 
      CurrentScreen::Game => {}, 
    }
  }
}

fn get_infos_elements() -> Result<((u16, u16), String)> {
  let original_size = terminal::size()?;
  let location = get_location()?;
  Ok((original_size, location))
} 

fn get_location() -> Result<String> {
    let mut args = std::env::args();
    args.next();
    let first = match args.next() {
        Some(addr) => addr,
        _ => {
            return Err(anyhow!("no argument provided"));
        }
    };
    Ok(first)
}

pub async fn game_loop(game_main: &Infos, mut receiver: mpsc::Receiver<serde_json::Value>) -> Result<mpsc::Receiver<serde_json::Value>> {
  game_setup()?;
  loop {
    let event: Event = event::read()?;
    if wrong_resize_game_page(&event)? == true {
      stdout()
        .execute(terminal::Clear(terminal::ClearType::All))?;
      stdout()
        .execute(cursor::MoveTo(0,0))?
        .execute(Print("Wrong terminal size, please resize"))?;
    } else if should_exit(&event)? == true {
      cleanup_and_quit(&game_main.original_size)?;
    } else if let Event::Key(key_event) = event {
        match key_event.code {
          KeyCode::Char('1') => {},
          KeyCode::Char('2') => {
            receiver = match create_game(&game_main, "online", receiver).await {
              Ok(receiver) => receiver,
              Err((error, receiver)) => {
                display_error(&error)?;
                receiver
              }
            };
          },
          KeyCode::Char('3') => {},
          KeyCode::Char('4') => {break Ok(receiver);},
          _ => {}
        }
      }
  }
}

pub fn wrong_resize_game_page(event: &Event) -> Result<bool> {
  if let Event::Resize(x,y ) = event {
    if *x < WIDTH || *y < HEIGHT {
      return Ok(true);
    }
    else {
      game_setup()?;
    }
  }
  Ok(false)
}

pub fn should_exit(event: &Event) -> Result<bool> {
  if let Event::Key(key_event) = event {
    if key_event.code == KeyCode::Esc || 
    (key_event.code == KeyCode::Char('c') 
    && key_event.modifiers == KeyModifiers::CONTROL) {
      return Ok(true);
    }
  }
  Ok(false)
}

pub fn cleanup_and_quit(original_size: &(u16, u16)) -> std::io::Result<()> {
  stdout().execute(cursor::Show)?;
  stdout().execute(SetCursorStyle::BlinkingBlock)?;
  stdout().execute(terminal::LeaveAlternateScreen)?;
  stdout().execute(terminal::SetSize(original_size.0, original_size.1))?;
  stdout().execute(PopKeyboardEnhancementFlags)?;
  terminal::disable_raw_mode()?;
  std::process::exit(0);
}

pub fn clean_terminal(original_size: &(u16, u16)) -> Result<()> {
  stdout().execute(cursor::Show)?;
  stdout().execute(terminal::LeaveAlternateScreen)?;
  stdout().execute(terminal::SetSize(original_size.0, original_size.1))?;
  stdout().execute(PopKeyboardEnhancementFlags)?;
  terminal::disable_raw_mode()?;
  Ok(())
}

fn display_error(message: &str) -> Result<()> {
	stdout().execute(terminal::Clear(terminal::ClearType::All))?;
	stdout()
		.queue(cursor::MoveTo(WIDTH / 2, HEIGHT / 2))?
		.queue(Print(message))?
		.queue(cursor::MoveTo(WIDTH/2, HEIGHT / 2 + 3))?
		.queue(Print("Press Esc to continue"))?;
	stdout().flush()?;
	loop {
		let event = event::read()?;
	
		if should_exit(&event)? == true {
			break ;
		}
	}
	Ok(())
}

// use std::env;
// use std::io;
// use crossterm::{terminal, ExecutableCommand};

// fn main() -> Result<(), Box<dyn std::error::Error>> {
//     let mut args = env::args();
//     args.next();
//     let first = match args.next() {
//         Some(addr) => addr,
//         None => {
//             eprintln!("No argument provided");
//             std::process::exit(1);
//         }
//     };
//     let mut stdout = io::stdout();
//     stdout.execute(terminal::Clear(terminal::ClearType::All))?;
//     Ok(())
// }

// use std::io::{self, Write};
// use crossterm::{
//     ExecutableCommand, QueueableCommand, execute,
//     terminal, cursor, style::{self, Stylize}
// };

// fn main() -> std::io::Result<()> {
//   let mut stdout = io::stdout();

//   // stdout.execute(terminal::Clear(terminal::ClearType::All))?;
//   execute!(stdout, terminal::EnterAlternateScreen)?;

//   let Ok((height, width)) = terminal::size() else {eprintln!("error in term size"); std::process::exit(1);}; 

//   for y in 0..width {
//     for x in 0..height {
//       if (y == 0 || y == width - 1) || (x == 0 || x == height - 1) {
//         // in this loop we are more efficient by not flushing the buffer.
//         stdout
//           .queue(cursor::MoveTo(x,y))?
//           .queue(style::PrintStyledContent( "█".magenta()))?;
//       }
//     }
//   }
//   stdout.flush()?;

//   execute!(stdout, terminal::LeaveAlternateScreen)
// }

// use std::io::{Write, stdout};
// use crossterm::{execute, style::Print};
// fn main() {
//     // will be executed directly
//     execute!(stdout(), Print("sum:\n".to_string()));
//     // will be executed directly
//     execute!(stdout(), Print("1 + 1 = ".to_string()), Print((1+1).to_string()));
// }

// // ==== Output ====
// // sum:
// // 1 + 1 = 2

// #![cfg(feature = "bracketed-paste")]
// use crossterm::{
//     event::{
//         read, DisableBracketedPaste, DisableFocusChange, DisableMouseCapture, EnableBracketedPaste,
//         EnableFocusChange, EnableMouseCapture, Event,
//     },
//     execute,
// };

// fn main() -> std::io::Result<()> {
//     execute!(
//          std::io::stdout(),
//          EnableBracketedPaste,
//          EnableFocusChange,
//          EnableMouseCapture
//     )?;
//     loop {
//         // `read()` blocks until an `Event` is available
//         match read()? {
//             Event::FocusGained => println!("FocusGained"),
//             Event::FocusLost => println!("FocusLost"),
//             Event::Key(event) => println!("{:?}", event),
//             Event::Mouse(event) => println!("{:?}", event),
//             #[cfg(feature = "bracketed-paste")]
//             Event::Paste(data) => println!("{:?}", data),
//             Event::Resize(width, height) => println!("New size {}x{}", width, height),
//         }
//     }
//     execute!(
//         std::io::stdout(),
//         DisableBracketedPaste,
//         DisableFocusChange,
//         DisableMouseCapture
//     )?;
//     Ok(())
// }