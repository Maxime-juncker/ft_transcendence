use std::{
  io::{Write, stdout, Stdout},
  time::Duration,
  thread,
  future::Future
};

use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio::net::TcpStream;

use anyhow::{Result, anyhow};
use std::thread::sleep;
use serde_json::{Value, Number};

use reqwest::{Client};

mod welcome;
mod game;
use crate::welcome::{global_setup, game_setup};
use crate::game::{create_game};

mod login;
use crate::login::{create_guest_session};
use tokio::sync::{mpsc, Mutex};

use crossterm::{
  cursor,
  event::{self, PopKeyboardEnhancementFlags, poll, Event, KeyCode, KeyModifiers},
  style::*,
  terminal,
  ExecutableCommand,
  QueueableCommand,
};

pub const NUM_ROWS: u16 = 30;
pub const NUM_COLS: u16 = 10;
struct Infos {
  original_size: (u16, u16),
  location: String,
  id: u64,
  client: Client,
  // ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
}

// impl Infos {
//   fn clone(&self)
// }

#[tokio::main]
async fn main() -> Result<()> {
  if crossterm::event::supports_keyboard_enhancement()? {
    eprintln!("Keyboard enhancement supporté"); 
  } else {
    eprintln!("PAS supporté !");
  }
  let original_size = terminal::size()?;
  let for_signal = original_size.clone();
  global_setup()?;
  ctrlc_async::set_handler(move || {
    eprintln!("here");
    cleanup_and_quit(&for_signal).unwrap();
  })?;
  let location = get_location();
  // location = format!("{location}");
  // println!("{location}");
  let (num, client, receiver) = create_guest_session(&location).await?;
  sleep(Duration::from_secs(1));
  let game_main = Infos {original_size, location, id: num, client};

  welcome_screen(&game_main, receiver).await?;
      // if let Event::Resize(x, y) = event {
      //   println!("HERE");
      //   set_terminal_size();
      // }

  cleanup_and_quit(&original_size)?;

  Ok(())

}

async fn welcome_screen(game_main: &Infos, receiver: mpsc::Receiver<serde_json::Value>) -> Result<()> {
    loop {
      let event = event::read()?;

      // if should_exit(&event)? == true {
      //   cleanup_and_quit(&stdout, &game_main.original_size)?;
      // }
      // else 
      if let Event::Key(key_event) = event {
        if key_event.code == KeyCode::Char('1') {
          game_loop(&game_main, receiver).await?;
          break Ok(());
        } else if key_event.code == KeyCode::Char('2') {

        } else if key_event.code == KeyCode::Char('3') {}
      }
    }
}

fn get_location() -> String {
    let mut args = std::env::args();
    args.next();
    let first = match args.next() {
        Some(addr) => addr,
        None => {
            eprintln!("No argument provided");
            std::process::exit(1);
        }
    };
    first
}

async fn game_loop<'a>(game_main: &'a Infos, receiver: mpsc::Receiver<serde_json::Value>) -> Result<()> {
  game_setup()?;
  
  loop {
    let event: Event = event::read()?;

    // if should_exit(&event)? == true {
    //   break cleanup_and_quit(&stdout, &game_main.original_size)?; //should quit
    // } else 
    if let Event::Key(key_event) = event {
        if key_event.code == KeyCode::Char('1') {
          break;
        } else if key_event.code == KeyCode::Char('2') {
          let _var = match create_game(&game_main, "online", receiver).await {
            Ok(()) => (),
            _ => return Err(anyhow::anyhow!("Error creating game")),
          };
          break;
//          online game;
        } else if key_event.code == KeyCode::Char('3') {
          break;
//          bot;
        } 
      }
  }
  Ok(())
}

pub fn should_exit(event: &Event) -> Result<bool> {
    if let Event::Key(key_event) = event {
      if key_event.code == KeyCode::Esc || 
      (key_event.code == KeyCode::Char('c') 
      && key_event.modifiers == KeyModifiers::CONTROL) {
        return Ok(true);
      }
    }
    return Ok(false);
}

pub fn cleanup_and_quit(original_size: &(u16, u16)) -> std::io::Result<()> {
  stdout().execute(cursor::Show)?;
  stdout().execute(terminal::LeaveAlternateScreen)?;
  stdout().execute(terminal::SetSize(original_size.0, original_size.1))?;
  stdout().execute(PopKeyboardEnhancementFlags)?;
  terminal::disable_raw_mode()?;
  std::process::exit(0);
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