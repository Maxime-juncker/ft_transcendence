const leftPaddle = document.querySelector('.paddle-left');
const rightPaddle = document.querySelector('.paddle-right');
const ball = document.querySelector('.ball');
const scoreLeft = document.querySelector('.score-left');
const scoreRight = document.querySelector('.score-right');
const pauseMessage = document.querySelector('.pause-message');
let leftPaddleY = 50;
let rightPaddleY = 50;
let ballX = 50;
let ballY = 50;
let ballSpeedX = 0.5;
let ballSpeedY = 0.5;
let totalScore = 0;
const paddleSpeed = 1.5;
const minY = 10;
const maxY = 90;
const paddleHeight = 20;
const maxAngle = 0.75;
let baseSpeed = 1.0;
let pauseGame = false;
const keysPressed = new Set();
function moveBall() {
    ballX += ballSpeedX;
    ballY += ballSpeedY;
    // wall collision
    if (ballY <= 0 || ballY >= 100) {
        ballSpeedY = -ballSpeedY;
    }
    // paddle collision
    if (ballX <= 5 && ballY >= leftPaddleY - (paddleHeight / 2) && ballY <= leftPaddleY + (paddleHeight / 2)) {
        baseSpeed += 0.08;
        let relativeIntersectY = (ballY - leftPaddleY) / (paddleHeight / 2);
        let newAngleY = relativeIntersectY * maxAngle;
        ballSpeedX = Math.abs(ballSpeedX);
        ballSpeedY = newAngleY;
        let currentSpeed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
        ballSpeedX = (ballSpeedX / currentSpeed) * baseSpeed;
        ballSpeedY = (ballSpeedY / currentSpeed) * baseSpeed;
    }
    else if (ballX >= 95 && ballY >= rightPaddleY - (paddleHeight / 2) && ballY <= rightPaddleY + (paddleHeight / 2)) {
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
    if (ballX < 0 || ballX > 100) {
        if (ballX < 0) {
            scoreRight.textContent = (parseInt(scoreRight.textContent || '0') + 1).toString();
        }
        else {
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
function movePaddle() {
    if (keysPressed.has('w') || keysPressed.has('W')) {
        leftPaddleY = Math.max(minY, leftPaddleY - paddleSpeed);
        leftPaddle.style.top = leftPaddleY + '%';
    }
    if (keysPressed.has('s') || keysPressed.has('S')) {
        leftPaddleY = Math.min(maxY, leftPaddleY + paddleSpeed);
        leftPaddle.style.top = leftPaddleY + '%';
    }
    if (keysPressed.has('ArrowUp')) {
        rightPaddleY = Math.max(minY, rightPaddleY - paddleSpeed);
        rightPaddle.style.top = rightPaddleY + '%';
    }
    if (keysPressed.has('ArrowDown')) {
        rightPaddleY = Math.min(maxY, rightPaddleY + paddleSpeed);
        rightPaddle.style.top = rightPaddleY + '%';
    }
}
function gameLoop() {
    if (!pauseGame) {
        moveBall();
        movePaddle();
    }
    requestAnimationFrame(gameLoop);
}
document.addEventListener('keydown', (event) => {
    keysPressed.add(event.key);
    if (event.key === 'p' || event.key === 'P' || event.key === ' ') {
        pauseGame = !pauseGame;
        if (pauseGame) {
            pauseMessage.style.display = 'block';
        }
        else {
            pauseMessage.style.display = 'none';
        }
    }
});
document.addEventListener('keyup', (event) => {
    keysPressed.delete(event.key);
});
gameLoop();
