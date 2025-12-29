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

use std::thread::{sleep};

use crossterm::{
  ExecutableCommand, QueueableCommand, cursor::{self, SetCursorStyle}, event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, PopKeyboardEnhancementFlags}, style::*, terminal
};

use crate::friends::FriendsDisplay;
use crate::game::GameStats;
use crate::LOGO;
use crate::CurrentScreen;
use ratatui::widgets::canvas::{Circle, Shape, Rectangle};
use ratatui::{
    prelude::Color,
    buffer::Buffer,
    layout::Rect,
    style::Stylize,
    symbols::{border, Marker},
    text::{Line, Text},
    widgets::{Block, Paragraph, Widget, canvas::Canvas},
    DefaultTerminal, Frame,
    text::Span,
};

pub const WIDTH: u16 = 90;
pub const HEIGHT: u16 = 30;

use super::Infos;

pub trait ScreenDisplayer: FriendsDisplay {
    fn display_welcome_screen(&self, area: Rect, buf: &mut Buffer);
    fn display_gamechoice_screen(&self, area: Rect, buf: &mut Buffer);
    fn display_social_screen(&self, area: Rect, buf: &mut Buffer);
    fn display_friends_screen(&self, area: Rect, buf: &mut Buffer);
    fn display_waiting_screen(&self, area: Rect, buf: &mut Buffer);
    fn display_login_screen(&self, area: Rect, buf: &mut Buffer);
    fn display_played_game(&self, area: Rect, buf: &mut Buffer);
}

impl ScreenDisplayer for Infos {
    fn display_login_screen(&self, area: Rect, buf: &mut Buffer) {
        let instructions = Line::from(vec![
                "1. ".bold(),
                "SIGNUP ".blue(),
                "2. ".bold(),
                "LOGIN ".blue(),
                "3. ".bold(),
                "SIGN IN AS GUEST ".blue(),
                "ESC. ".bold(),
                "Quit".blue(),
        ]);
        print_block(instructions, area, buf);
    }
    fn display_welcome_screen(&self, area: Rect, buf: &mut Buffer) {
        let instructions = Line::from(vec![
                "1. ".bold(),
                "GAME ".blue(),
                "2. ".bold(),
                "SOCIAL LIFE ".blue(),
                "ESC. ".bold(),
                "Quit".blue(),
        ]);
        print_block(instructions, area, buf);
    }
    fn display_gamechoice_screen(&self, area: Rect, buf: &mut Buffer) {
        let instructions = Line::from(vec![
                "1. ".bold(),
                "LOCAL ".blue(),
                "2. ".bold(),
                "ONLINE ".blue(),
                "4. ".bold(),
                "GO BACK ".blue(),
                "ESC. ".bold(),
                "Quit".blue(),
        ]);
        print_block(instructions, area, buf);
    }
    fn display_social_screen(&self, area: Rect, buf: &mut Buffer) {
     let instructions = Line::from(vec![
            "1. ".bold(),
            "YOUR FRIENDS ".blue(),
            "2. ".bold(),
            "CHAT ".blue(),
            "3. ".bold(),
            "GO BACK ".blue(),
            "ESC. ".bold(),
            "Quit".blue(),
    ]);
        print_block(instructions, area, buf);
    }
    fn display_waiting_screen(&self, area: Rect, buf: &mut Buffer) {
        let block = Block::bordered().border_set(border::THICK);
        let spanlist: Vec<Span> = vec!["Waiting\n".bold(), "For\n".bold(), "Opponents\n".bold()];
        Paragraph::new(Line::from(spanlist))
            .centered()
            .block(block)
            .render(area, buf);
    }
    fn display_friends_screen(&self, area: Rect, buf: &mut Buffer){
        let instructions = Line::from(vec![
            "1. ".bold(),
            "ADD FRIEND ".blue(),
            "2. ".bold(),
            "DELETE FRIEND ".blue(),
            "← ".bold(),
            "Previous ".blue(),
            "→ ".bold(),
            "Next ".blue(),
            "ESC. ".bold(),
            "Quit".blue(),
        ]);
        let block = Block::bordered()
                .title(Line::from("Your Friends").bold().centered())
                .title_bottom(instructions.centered())
                .border_set(border::THICK);
        let mut spanlist: Vec<Span> = vec![];
        for line in &self.friends {
            let newline = line.clone().bold();
            spanlist.push(newline);
        }
        Paragraph::new(Line::from(spanlist))
                .centered()
                .block(block)
                .render(area, buf);
    }
    fn display_played_game(&self, area: Rect, buf: &mut Buffer) {
        Canvas::default()
            .block(Block::bordered().title("Pong"))
            .marker(Marker::Braille)
            .x_bounds([0.0, 100.0])
            .y_bounds([0.0, 100.0])
            .paint(|ctx| {
                ctx.draw(&Circle {
                    x: self.game.game_stats.ball_x as f64,
                    y: self.game.game_stats.ball_y as f64,
                    radius: 0.5,
                    color: Color::Yellow,
                });
                ctx.draw(&Rectangle {
                    x: 5.0,
                    y: self.game.game_stats.left_y as f64,
                    width: 2.0,
                    height: 10.0,
                    color: Color::Green,
                });
                ctx.draw(&Rectangle {
                    x: 95.0,
                    y: self.game.game_stats.right_y as f64,
                    width: 2.0,
                    height: 10.0,
                    color: Color::Green,
                });
            });
    }
}

fn print_block(instructions: Line, area: Rect, buf: &mut Buffer) {
    let block = Block::bordered()
            .title_bottom(instructions.centered())
            .border_set(border::THICK);
    Paragraph::new(LOGO)
            .centered()
            .block(block)
            .render(area, buf);        
}

// impl Shape for GameStats {
//     // Required method
//     fn draw(&self, painter: &mut Painter<'_, '_>) {

//     }
// }

// fn normalize(message: (f32, f32, f32, f32, f32, f32, u8, u8)) -> (u16, u16, u16, u16, f32, f32, u8, u8) {
//     let (left_y, right_y, ball_x, ball_y, _speed_x, _speed_y, player1_score, player2_score) = message;
//     let my_left_y = (left_y * HEIGHT as f32 / 100.0) as u16;
//     let my_right_y = (right_y * HEIGHT as f32 / 100.0) as u16;
//     let my_ball_y = (ball_y * HEIGHT as f32 / 100.0) as u16;
//     let my_ball_x = (ball_x * WIDTH as f32 / 100.0) as u16;
//     (my_left_y, my_right_y, my_ball_x, my_ball_y, _speed_x, _speed_y, player1_score, player2_score)
// }

// fn display(message: (f32, f32, f32, f32, f32, f32, u8, u8)) -> Result<()> {
//     stdout().execute(terminal::Clear(terminal::ClearType::All))?;
//     let normalized = normalize(message);
//     let (left_y, right_y, ball_x, ball_y, speed_x, speed_y, player1_score, player2_score) = normalized;
//     // borders(&stdout)?;
//     stdout()
//         .queue(cursor::MoveTo(ball_x, ball_y))?
//         .queue(Print("o"))?
//         .queue(cursor::MoveTo(1, left_y))?
//         .queue(Print("I"))?
//         .queue(cursor::MoveTo(WIDTH - 1, right_y))?
//         .queue(Print("I"))?;
//     stdout().flush()?;
//     Ok(())
// }X


// async fn display_friends(game_main: &Infos) -> Result<()> {
//     let mut index: usize = 0;
//     loop {
//         let friends_list = get_friends(game_main).await?;
//         print_friends(&friends_list, &index)?;
//         if (poll(Duration::from_millis(16)))? {
//             let event: Event = event::read()?;
    
//             if (should_exit(&event))? == true {
//                 return Ok(());
//             }
//             else if let Event::Key(key_event) = event {
//                 match key_event.code {
//                     KeyCode::Char('1') => {add_friend(game_main).await?},
//                     KeyCode::Char('2') => {delete_friend(game_main).await?},
//                     KeyCode::Char('3') => {},
//                     KeyCode::Right => {
//                         if index < usize::MAX {
//                             index += 1;
//                         }
//                     },
//                     KeyCode::Left => {if index > 0 {
//                         index -= 1;
//                        }
//                     },
//                     _ => {},
//                 }
//             }
//         }
//     }
// }