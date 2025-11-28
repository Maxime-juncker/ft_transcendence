use std::{
  io::{Write, stdout, Stdout},
  time::Duration,
  future::Future
};

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

use crossterm::{
  cursor,
  event::{self, poll, Event, KeyCode, KeyModifiers},
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
}

// impl Infos {
//   fn clone(&self)
// }

#[tokio::main]
async fn main() -> Result<()> {
  let mut stdout: Stdout = stdout();

  let original_size = terminal::size()?;
  let location = get_location();
  // location = format!("{location}");
  // println!("{location}");
  let (num, client) = create_guest_session(&location, &stdout).await?;
  sleep(Duration::from_secs(3));
  let game_main = Infos {original_size, location, id: num, client};
  global_setup(&stdout)?;

  'drawing: loop {
      let event = event::read()?;

      if should_exit(&event)? == true {
        break;
      }
      else if let Event::Key(key_event) = event {
        if key_event.code == KeyCode::Char('1') {
          game_loop(&stdout, &game_main).await?;
          break ;
        } else if key_event.code == KeyCode::Char('2') {

        } else if key_event.code == KeyCode::Char('3') {}
      }

      // if let Event::Resize(x, y) = event {
      //   println!("HERE");
      //   set_terminal_size();
      // }

  }

  cleanup_terminal(&stdout, &game_main)?;

  Ok(())

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

async fn game_loop<'a>(stdout: &Stdout, game_main: &'a Infos) -> Result<()> {
  game_setup(&stdout)?;
  
  loop {
    let event: Event = event::read()?;

    if should_exit(&event)? == true {
      break cleanup_terminal(&stdout, &game_main)?; //should quit
    } else if let Event::Key(key_event) = event {
        if key_event.code == KeyCode::Char('1') {
          break;
        } else if key_event.code == KeyCode::Char('2') {
          let _var = match create_game(&game_main, "online").await {
            Ok(()) => (),
            _ => return Err(anyhow::anyhow!("Error creating game")),
          };
          break;
//          online game;
        } else if key_event.code == KeyCode::Char('3') {
//          bot;
        } 
      }
  }
  Ok(())
}

fn should_exit(event: &Event) -> Result<bool> {
    if let Event::Key(key_event) = event {
      if key_event.code == KeyCode::Esc || 
      (key_event.code == KeyCode::Char('c') 
      && key_event.modifiers == KeyModifiers::CONTROL) {
        return Ok(true);
      }
    }
    return Ok(false);
}

fn cleanup_terminal(mut stdout: &Stdout, game_main: &Infos) -> std::io::Result<()> {
  stdout.execute(cursor::Show)?;
  stdout.execute(terminal::LeaveAlternateScreen)?;
  stdout.execute(terminal::SetSize(game_main.original_size.0, game_main.original_size.1))?;
  terminal::disable_raw_mode()?;
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