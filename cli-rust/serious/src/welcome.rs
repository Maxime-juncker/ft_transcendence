use std::{
    io::{Write, stdout},
};

use crossterm::{
    ExecutableCommand, QueueableCommand, cursor, event::{KeyboardEnhancementFlags, PushKeyboardEnhancementFlags}, style::*, terminal::{self, SetTitle}
};

use crate::{HEIGHT, WIDTH};

pub const LOGO: &str = r#"
  ██████╗  ██████╗ ███╗   ██╗ ██████╗ 
  ██╔══██╗██╔═══██╗████╗  ██║██╔════╝ 
  ██████╔╝██║   ██║██╔██╗ ██║██║  ███╗
  ██╔═══╝ ██║   ██║██║╚██╗██║██║   ██║
  ██║     ╚██████╔╝██║ ╚████║╚██████╔╝
  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ 
  "#;

pub fn draw_welcome_screen() -> std::io::Result<()> {
    stdout().execute(terminal::Clear(terminal::ClearType::All))?;
    borders()?;
    draw_logo(LOGO)?;
    set_welcome_options()?;
    stdout().flush()?;
    Ok(())
}

pub fn draw_friends_screen() -> std::io::Result<()> {
    stdout().execute(terminal::Clear(terminal::ClearType::All))?;
    borders()?;
    draw_logo(LOGO)?;
    set_friends_options()?;
    stdout().flush()?;
    Ok(())
}

pub fn game_setup() -> std::io::Result<()> {
    stdout().execute(terminal::Clear(terminal::ClearType::All))?;
    borders()?;
    draw_logo(LOGO)?;
    set_game_options()?;
    stdout().flush()?;
    Ok(())
}

pub fn setup_terminal() -> std::io::Result<()> {
    terminal::enable_raw_mode()?;
    stdout().execute(terminal::EnterAlternateScreen)?;
    stdout().execute(cursor::Hide)?;
    stdout().execute(terminal::SetSize(WIDTH, HEIGHT))?;
    stdout().execute(terminal::Clear(terminal::ClearType::All))?;
    stdout().execute(PushKeyboardEnhancementFlags(
        KeyboardEnhancementFlags::REPORT_EVENT_TYPES
    ))?;
    Ok(())
}
  
pub fn borders() -> std::io::Result<()> {
    for y in 1..HEIGHT {
        stdout()
            .queue(cursor::MoveTo(0, y))?
            .queue(Print("||"))?
            .queue(cursor::MoveTo(WIDTH, y))?
            .queue(Print("||"))?;
    }
    for x in 2..WIDTH - 1 {
        stdout()
            .queue(cursor::MoveTo(x, 0))?
            .queue(Print("="))?
            .queue(cursor::MoveTo(x, HEIGHT))?
            .queue(Print("="))?;
    }
    stdout()
        .queue(cursor::MoveTo(0,0))?
        .queue(Print("*"))?
        .queue(cursor::MoveTo(0,HEIGHT))?
        .queue(Print("*"))?
        .queue(cursor::MoveTo(WIDTH,0))?
        .queue(Print("*"))?
        .queue(cursor::MoveTo(WIDTH,HEIGHT))?
        .queue(Print("*"))?;
    Ok(())
}

fn draw_logo(logo: &str) -> std::io::Result<()> {
    
    for (i, line) in logo.lines().enumerate() {
        stdout()
            .queue(cursor::MoveTo((WIDTH - 40) / 2, 2 + i as u16))?
            .queue(Print(line))?;
    }
    Ok(())
}

fn set_welcome_options() -> std::io::Result<()> {
    stdout()
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 13))?
        .queue(Print("1. GAME"))?
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 16))?
        .queue(Print("2. SOCIAL LIFE"))?
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 19))?
        .queue(Print("3. SETTINGS"))?;
    Ok(())
}

fn set_friends_options() -> std::io::Result<()> {
    stdout()
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 13))?
        .queue(Print("1. YOUR FRIENDS"))?
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 16))?
        .queue(Print("2. CHAT"))?
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 19))?
        .queue(Print("3. GO BACK"))?;
    Ok(())
}

fn set_game_options() -> std::io::Result<()> {
    stdout()
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 13))?
        .queue(Print("1. LOCAL"))?
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 16))?
        .queue(Print("2. ONLINE"))?
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 19))?
        .queue(Print("3. BOT"))?
        .queue(cursor::MoveTo((WIDTH - 6) / 2, 22))?
        .queue(Print("4. GO BACK"))?;
    Ok(())
}