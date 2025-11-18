export const loginPage = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">

		<title>ft_transcendence</title>
		<link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnected" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
		<link href="css/style.css" rel="stylesheet">
		<head/>
		<body>
			<button id="forty_two_log_btn">log with intra</button>
			<button id="github_log_btn">log with github</button>
			<button id="guest_log_btn">log with github</button>

			<h1>create new user</h1>
			<div>
				<input id="create_email" type="email" placeholder="email">
				<input id="create_passw" type="password" placeholder="password">
				<input id="create_username" type="text" placeholder="username">

				<button id="create_btn" type="submit">submit</button>
			</div>
			<h1>login</h1>
			<div>
				<input id="login_email" type="email" placeholder="email">
				<input id="login_passw" type="password" placeholder="password">
				<input id="login_totp" type="totp" placeholder="totp">
				<button id="login_btn" type="submit">submit</button>
				<button id="refresh_btn" type="submit">refresh self</button>
			</div>
			<h1>totp</h1>
			<div>
				<button id="del_totp" type="button">delete totp</button>
				<button id="new_totp" type="button">request new</button>
				<input id="totp_check" type="totp" placeholder="totp">
				<button id="totp_check_send" type="submit">check</button>
			</div>
			<div id="qrcode_holder">
			</div>

			<h3 id="placeholder">placeholder</h3>

			<div id="friends_list" style="border: 1px solid #ccc;">
			</div>
			<h1>------</h1>
			<div id="friends_pndg_list" style="border: 1px solid #ccc;">
			</div>

			<div style="display: flex; flex-direction: column; justify-content: center; border: 1px solid #ccc; padding: 10px">
				<input type="file" id="avatar_input" accept="image/png, image/jpeg" />
				<button id="avatar_upload_btn">send</button>
			</div>
			<div class="friend-menu" style="border: solid 1px #ccc;">
				<h1>add friend</h1>
				<input id="add_friend_input" placeholder="enter name"/>
				<button id="add_friend_btn">send invite</button>
			</div>

			<div style="margin-top: 50px;">
				<p>&lt;chat&gt;</p>
				<div id="chatbox" class="debug-box">
				</div>
				<input id="chat_input" placeholder="enter msg...">
				<button id="chat_send_btn">send</button>
			</div>

			<script>var exports = {};</script>
			<script type="module" src="./dist/login.js"></script>
		</body>
</html>
`;
