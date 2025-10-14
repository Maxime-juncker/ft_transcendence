const leftPaddle = document.querySelector('.paddle-left') as HTMLElement;
const rightPaddle = document.querySelector('.paddle-right') as HTMLElement;
const ball = document.querySelector('.ball') as HTMLElement;
const scoreLeft = document.querySelector('.score-left') as HTMLElement;
const scoreRight = document.querySelector('.score-right') as HTMLElement;
const pauseMessage = document.querySelector('.pause-message') as HTMLElement;

let leftPaddleY: number = 50;
let rightPaddleY: number = 50;
let ballX: number = 50;
let ballY: number = 50;
let ballSpeedX: number = 0.5;
let ballSpeedY: number = 0.5;
let totalScore: number = 0;
const paddleSpeed: number = 1.5;
const minY: number = 10;
const maxY: number = 90;
const paddleHeight: number = 20;
const maxAngle: number = 0.75;
let baseSpeed: number = 1.0;
let pauseGame: boolean = false;
const keysPressed: Set<string> = new Set();

function moveBall(): void
{
	ballX += ballSpeedX;
	ballY += ballSpeedY;

	// wall collision
	if (ballY <= 0 || ballY >= 100)
	{
		ballSpeedY = -ballSpeedY;
	}

	// paddle collision
	if (ballX <= 5 && ballY >= leftPaddleY - (paddleHeight / 2) && ballY <= leftPaddleY + (paddleHeight / 2))
	{
		baseSpeed += 0.08;
		let relativeIntersectY = (ballY - leftPaddleY) / (paddleHeight / 2);
		let newAngleY = relativeIntersectY * maxAngle;

		ballSpeedX = Math.abs(ballSpeedX);
		ballSpeedY = newAngleY;

		let currentSpeed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
		ballSpeedX = (ballSpeedX / currentSpeed) * baseSpeed;
		ballSpeedY = (ballSpeedY / currentSpeed) * baseSpeed;
	}
	else if (ballX >= 95 && ballY >= rightPaddleY - (paddleHeight / 2) && ballY <= rightPaddleY + (paddleHeight / 2))
	{
		baseSpeed += 0.08;
		let relativeIntersectY = (ballY - rightPaddleY) / (paddleHeight / 2);
		let newAngleY = relativeIntersectY * maxAngle;
		
		ballSpeedX = -Math.abs(ballSpeedX);
		ballSpeedY = newAngleY;
		
		let currentSpeed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
		ballSpeedX = (ballSpeedX / currentSpeed) * baseSpeed;
		ballSpeedY = (ballSpeedY / currentSpeed) * baseSpeed;
	}

	// goal !!
	if (ballX < 0 || ballX > 100)
	{
		if (ballX < 0)
		{
			scoreRight.textContent = (parseInt(scoreRight.textContent || '0') + 1).toString();
		}
		else
		{
			scoreLeft.textContent = (parseInt(scoreLeft.textContent || '0') + 1).toString();
		}
		baseSpeed = 1.0;
		totalScore++;
		ballSpeedX = (totalScore % 2 === 0) ? 0.5 : -0.5;
		ballX = 50;
		ballY = Math.random() * 100;
	}

	ball.style.left = ballX + '%';
	ball.style.top = ballY + '%';
}

function movePaddle(): void
{
	if (keysPressed.has('w') || keysPressed.has('W'))
	{
		leftPaddleY = Math.max(minY, leftPaddleY - paddleSpeed);
		leftPaddle.style.top = leftPaddleY + '%';
	}
	if (keysPressed.has('s') || keysPressed.has('S'))
	{
		leftPaddleY = Math.min(maxY, leftPaddleY + paddleSpeed);
		leftPaddle.style.top = leftPaddleY + '%';
	}
	if (keysPressed.has('ArrowUp'))
	{
		rightPaddleY = Math.max(minY, rightPaddleY - paddleSpeed);
		rightPaddle.style.top = rightPaddleY + '%';
	}
	if (keysPressed.has('ArrowDown'))
	{
		rightPaddleY = Math.min(maxY, rightPaddleY + paddleSpeed);
		rightPaddle.style.top = rightPaddleY + '%';
	}
}

function gameLoop(): void
{
	if (!pauseGame)
	{
		moveBall();
		movePaddle();
	}
	requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event: KeyboardEvent): void =>
{
	keysPressed.add(event.key);
	if (event.key === 'p' || event.key === 'P' || event.key === ' ')
	{
		pauseGame = !pauseGame;
		if (pauseGame)
		{
			pauseMessage.style.display = 'block';
		}
		else
		{
			pauseMessage.style.display = 'none';
		}
	}
});

document.addEventListener('keyup', (event: KeyboardEvent): void =>
{
	keysPressed.delete(event.key);
});

gameLoop();