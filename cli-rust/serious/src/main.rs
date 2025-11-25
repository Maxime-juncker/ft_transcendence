use std::{
  io::{Write, stdout, Stdout},
  time::Duration,
};

mod welcome;
use crate::welcome::{global_setup};

use std::process::Command;

use std::io::{Result};

use crossterm::{
  cursor,
  event::{self, poll, Event, KeyCode, KeyModifiers},
  style::*,
  terminal,
  ExecutableCommand,
};

pub const NUM_ROWS: u16 = 30;
pub const NUM_COLS: u16 = 10;

fn main() -> Result<()> {
  let mut stdout: Stdout = stdout();

  let original_size = terminal::size()?;
  global_setup(&stdout);
  // set_welcome(&stdout)?;



  'drawing: loop {
      let event = event::read()?;

      if should_exit(&event)? == true {
        break;
      }

      // if let Event::Resize(x, y) = event {
      //   println!("HERE");
      //   set_terminal_size();
      // }


    //.. our clean up from above
  }

  cleanup_terminal(&stdout, original_size)?;

  Ok(())

}

fn should_exit(event: &Event) -> Result<bool> {
    if let Event::Key(key_event) = event.to_owned() {
      if key_event.code == KeyCode::Esc || 
      (key_event.code == KeyCode::Char('c') 
      && key_event.modifiers == KeyModifiers::CONTROL) {
        return Ok(true);
      }
    }
    return Ok(false);
}

fn cleanup_terminal(mut stdout: &Stdout, original_size: (u16, u16)) -> std::io::Result<()> {
  stdout.execute(cursor::Show)?;
  stdout.execute(terminal::LeaveAlternateScreen)?;
  stdout.execute(terminal::SetSize(original_size.0, original_size.1))?;
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
//     println!("Thank you for {first}");

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