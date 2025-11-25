use std::{
    io::{Write, stdout, Stdout},
    time::Duration,
};

use std::process::Command;

use std::io::{Result};

use crossterm::{
    cursor,
    event::{self, poll, Event, KeyCode, KeyModifiers},
    style::*,
    terminal,
    ExecutableCommand,
    QueueableCommand,
    queue,
};

pub const NUM_ROWS: u16 = 90;
pub const NUM_COLS: u16 = 30;
const LOGO: &str = r#"
  ██████╗  ██████╗ ███╗   ██╗ ██████╗ 
  ██╔══██╗██╔═══██╗████╗  ██║██╔════╝ 
  ██████╔╝██║   ██║██╔██╗ ██║██║  ███╗
  ██╔═══╝ ██║   ██║██║╚██╗██║██║   ██║
  ██║     ╚██████╔╝██║ ╚████║╚██████╔╝
  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ 
  "#;

pub fn global_setup(mut stdout: &Stdout) -> std::io::Result<()> {
    setup_terminal(&stdout);
    set_styles(&stdout);
    borders(&stdout);
    draw_logo(&stdout, LOGO)?;
    // set_options(&stdout);
    stdout.flush()?;
    Ok(())
}

fn setup_terminal(mut stdout: &Stdout) -> std::io::Result<()> {
    terminal::enable_raw_mode()?;
    stdout.execute(terminal::EnterAlternateScreen)?;
    stdout.execute(cursor::Hide)?;
    stdout.execute(terminal::SetSize(NUM_ROWS, NUM_COLS))?;
    Ok(())
}
  
fn set_styles(mut stdout: &Stdout) -> std::io::Result<()> {
    // stdout.execute(SetBackgroundColor(Color::Grey))?;
    // stdout.execute(SetForegroundColor(Color::Red))?;
    stdout.execute(terminal::Clear(terminal::ClearType::All))?;
    Ok(())
}

fn borders(mut stdout: &Stdout) -> std::io::Result<()> {
    for y in 1..NUM_COLS {
        stdout
            .queue(cursor::MoveTo(0, y))?
            .queue(Print("||"))?
            .queue(cursor::MoveTo(NUM_ROWS, y))?
            .queue(Print("||"))?;
    }
    for x in 2..NUM_ROWS - 1 {
        stdout
            .queue(cursor::MoveTo(x, 0))?
            .queue(Print("="))?
            .queue(cursor::MoveTo(x, NUM_COLS))?
            .queue(Print("="))?;
    }
    stdout
        .queue(cursor::MoveTo(0,0))?
        .queue(Print("*"))?
        .queue(cursor::MoveTo(0,NUM_COLS))?
        .queue(Print("*"))?
        .queue(cursor::MoveTo(NUM_ROWS,0))?
        .queue(Print("*"))?
        .queue(cursor::MoveTo(NUM_ROWS,NUM_COLS))?
        .queue(Print("*"))?;
    Ok(())
}

fn draw_logo(mut stdout: &Stdout, logo: &str) -> std::io::Result<()> {
    
    for (i, line) in logo.lines().enumerate() {
        stdout
            .queue(cursor::MoveTo((NUM_ROWS - 40) / 2, 2 + i as u16))?
            .queue(Print(line))?;
    }
    stdout
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 13))?
        .queue(Print("1. GAME"))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 16))?
        .queue(Print("2. TOURNAMENT"))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 19))?
        .queue(Print("3. SETTINGS"))?;
    Ok(())
}

// fn set_options(mut stdout: &Stdout) -> std::io::Result<()> {
//     stdout
//         .queue
// }