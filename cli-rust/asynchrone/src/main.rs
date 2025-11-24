use std::time::Duration;
use std::pin::{Pin, pin};

fn main() {
    trpl::run(async {
        let (tx, mut rx) = trpl::channel();

        let tx1 = tx.clone();
        let tx1_fut = pin!(async move {
            let vals = vec![
                String::from("hi"),
                String::from("from"),
                String::from("the"),
                String::from("future"),
            ];

            for val in vals {
                tx1.send(val).unwrap();
                trpl::sleep(Duration::from_millis(500)).await;
            }
        });

        let rx_fut = pin!(async {
            while let Some(value) = rx.recv().await {
                println!("received '{value}'");
            }
        });

        let tx_fut = pin!(async move {
            let vals = vec![
                String::from("more"),
                String::from("messages"),
                String::from("for"),
                String::from("you"),
            ];

            for val in vals {
                tx.send(val).unwrap();
                trpl::sleep(Duration::from_millis(1500)).await;
            }
        });

        let futures: Vec<Pin<Box<dyn Future<Output = ()>>>> = vec![Box::pin(tx1_fut), Box::pin(rx_fut), Box::pin(tx_fut)];
        trpl::join_all(futures).await;
    });
}


















//Small fetcher

// use trpl::{Either, Html};
// use std::env;

// async fn page_title(url: &str) -> (&str, Option<String>) {
//     let response_text = trpl::get(url).await.text().await;
//     let title = Html::parse(&response_text)
//         .select_first("title")
//         .map(|title| title.inner_html());
//     (url, title)
// }

// fn main() {
//     let args: Vec<String> = env::args().collect();
    
//     trpl::run(async {
//         let title_future_1 = page_title(&args[1]);
//         let title_future_2 = page_title(&args[2]);

//         let (url, maybe_title) = 
//             match trpl::race(title_future_1, title_future_2).await {
//                 Either::Left(left) => left,
//                 Either::Right(right) => right,
//             };
//         println!("{url} returned first");
//         match maybe_title {
//             Some(title) => println!("Its page title was '{title}'"),
//             None => println!("It had no page title"),
//         }
//     })
// }
