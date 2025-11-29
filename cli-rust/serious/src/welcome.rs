use std::{
    io::{Write, stdout, Stdout},
    time::Duration,
};

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
    setup_terminal(&stdout)?;
    stdout.execute(terminal::Clear(terminal::ClearType::All))?;
    borders(&stdout)?;
    draw_logo(&stdout, LOGO)?;
    set_welcome_options(&stdout)?;
    stdout.flush()?;
    Ok(())
}

pub fn game_setup(mut stdout: &Stdout) -> std::io::Result<()> {
    clean_options(&stdout)?;
    set_game_options(&stdout)?;
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
    Ok(())
}

fn set_welcome_options(mut stdout: &Stdout) -> std::io::Result<()> {
    stdout
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 13))?
        .queue(Print("1. GAME"))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 16))?
        .queue(Print("2. TOURNAMENT"))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 19))?
        .queue(Print("3. SETTINGS"))?;
    Ok(())
}

fn set_game_options(mut stdout: &Stdout) -> std::io::Result<()> {
    stdout
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 13))?
        .queue(Print("1. LOCAL"))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 16))?
        .queue(Print("2. ONLINE"))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 19))?
        .queue(Print("3. BOT"))?;
    Ok(())
}

fn clean_options(mut stdout: &Stdout) -> std::io::Result<()> {
    stdout
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 13))?
        .queue(Print("                          "))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 16))?
        .queue(Print("                          "))?
        .queue(cursor::MoveTo((NUM_ROWS - 6) / 2, 19))?
        .queue(Print("                          "))?;
    Ok(())
}

fn normalize(message: (f32, f32, f32, f32, f32, f32, u8, u8)) -> (u16, u16, u16, u16, f32, f32, u8, u8) {
    let (left_y, right_y, ball_x, ball_y, speed_x, speed_y, player1_score, player2_score) = message;
    let my_left_y = (left_y * NUM_COLS as f32 / 100.0) as u16;
    let my_right_y = (right_y * NUM_COLS as f32 / 100.0) as u16;
    let my_ball_y = (ball_y * NUM_COLS as f32 / 100.0) as u16;
    let my_ball_x = (ball_x * NUM_ROWS as f32 / 100.0) as u16;
    (my_left_y, my_right_y, my_ball_x, my_ball_y, speed_x, speed_y, player1_score, player2_score)
}

pub fn display(message: (f32, f32, f32, f32, f32, f32, u8, u8), mut stdout: &Stdout) -> Result<()> {
    stdout.execute(terminal::Clear(terminal::ClearType::All))?;
    let normalized = normalize(message);
    let (left_y, right_y, ball_x, ball_y, speed_x, speed_y, player1_score, player2_score) = normalized;
    // borders(&stdout)?;
    stdout
        .queue(cursor::MoveTo(ball_x, ball_y))?
        .queue(Print("o"))?
        .queue(cursor::MoveTo(1, left_y))?
        .queue(Print("I"))?
        .queue(cursor::MoveTo(NUM_ROWS - 1, right_y))?
        .queue(Print("I"))?;
    stdout.flush()?;
    Ok(())
}

	// PADDLE_HEIGHT = 15,
	// PADDLE_WIDTH = 1,
	// PADDLE_PADDING = 2,
	// BALL_SIZE = 2,