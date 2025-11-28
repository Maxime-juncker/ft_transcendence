enum StateIndex
{
	LEFT_PADDLE_Y = 0,
	RIGHT_PADDLE_Y = 1,
	BALL_X = 2,
	BALL_Y = 3,
	SPEED_X = 4,
	SPEED_Y = 5,
	PLAYER1_SCORE = 0,
	PLAYER2_SCORE = 1
}

export class GameState
{
	private static readonly FLOAT_NB: number = 6;
	private static readonly FLOAT_BYTE_SIZE: number = 4;
	private static readonly FLOAT_SIZE: number = GameState.FLOAT_NB * GameState.FLOAT_BYTE_SIZE;
	private static readonly INT_NB: number = 2;
	private static readonly INT_BYTE_SIZE: number = 1;
	private static readonly INT_SIZE: number = GameState.INT_NB * GameState.INT_BYTE_SIZE;
	private static readonly BUFFER_SIZE: number = GameState.FLOAT_SIZE + GameState.INT_SIZE;

	private buffer: ArrayBuffer;
	private floatArray: Float32Array;
	private intArray: Uint8Array;

	private reversedBuffer: ArrayBuffer;
	private reversedFloatArray: Float32Array;
	private reversedIntArray: Uint8Array;

	constructor(buffer ?: ArrayBuffer)
	{
		if (!buffer)
		{
			this.buffer = new ArrayBuffer(GameState.BUFFER_SIZE);
			this.floatArray = new Float32Array(this.buffer, 0, GameState.FLOAT_NB).fill(50);
			this.floatArray[StateIndex.SPEED_X] = (Math.random() < 0.5) ? 0.5 : -0.5;
			this.floatArray[StateIndex.SPEED_Y] = (Math.random() - 0.5) * 2;
			this.intArray = new Uint8Array(this.buffer, GameState.FLOAT_SIZE, GameState.INT_NB).fill(0);
		}
		else
		{
			if (buffer.byteLength !== GameState.BUFFER_SIZE)
			{
				throw new Error(`Invalid buffer size: expected ${GameState.BUFFER_SIZE}, got ${buffer.byteLength}`);
			}

			this.buffer = buffer;
			this.floatArray = new Float32Array(this.buffer, 0, GameState.FLOAT_NB);
			this.intArray = new Uint8Array(this.buffer, GameState.FLOAT_SIZE, GameState.INT_NB);
		}

		this.reversedBuffer = new ArrayBuffer(GameState.BUFFER_SIZE);
		this.reversedFloatArray = new Float32Array(this.reversedBuffer, 0, GameState.FLOAT_NB);
		this.reversedIntArray = new Uint8Array(this.reversedBuffer, GameState.FLOAT_SIZE, GameState.INT_NB);
	}

	get stateBuffer(): ArrayBuffer	{ return (this.buffer); }

	get reversedStateBuffer(): ArrayBuffer
	{
		this.reversedFloatArray[StateIndex.LEFT_PADDLE_Y] = this.floatArray[StateIndex.RIGHT_PADDLE_Y];
		this.reversedFloatArray[StateIndex.RIGHT_PADDLE_Y] = this.floatArray[StateIndex.LEFT_PADDLE_Y];
		this.reversedFloatArray[StateIndex.BALL_X] = 100 - this.floatArray[StateIndex.BALL_X];
		this.reversedFloatArray[StateIndex.BALL_Y] = this.floatArray[StateIndex.BALL_Y];
		this.reversedFloatArray[StateIndex.SPEED_X] = -this.floatArray[StateIndex.SPEED_X];
		this.reversedFloatArray[StateIndex.SPEED_Y] = this.floatArray[StateIndex.SPEED_Y];
		this.reversedIntArray[StateIndex.PLAYER1_SCORE] = this.intArray[StateIndex.PLAYER2_SCORE];
		this.reversedIntArray[StateIndex.PLAYER2_SCORE] = this.intArray[StateIndex.PLAYER1_SCORE];

		return (this.reversedBuffer);
	}

	get leftPaddleY(): number		{ return (this.floatArray[StateIndex.LEFT_PADDLE_Y]); }
	get rightPaddleY(): number		{ return (this.floatArray[StateIndex.RIGHT_PADDLE_Y]); }
	get ballX(): number				{ return (this.floatArray[StateIndex.BALL_X]); }
	get ballY(): number				{ return (this.floatArray[StateIndex.BALL_Y]); }
	get speedX(): number			{ return (this.floatArray[StateIndex.SPEED_X]); }
	get speedY(): number			{ return (this.floatArray[StateIndex.SPEED_Y]); }
	get player1Score(): number		{ return (this.intArray[StateIndex.PLAYER1_SCORE]); }
	get player2Score(): number		{ return (this.intArray[StateIndex.PLAYER2_SCORE]); }

	set leftPaddleY(value: number)	{ this.floatArray[StateIndex.LEFT_PADDLE_Y] = value; }
	set rightPaddleY(value: number)	{ this.floatArray[StateIndex.RIGHT_PADDLE_Y] = value; }
	set ballX(value: number)		{ this.floatArray[StateIndex.BALL_X] = value; }
	set ballY(value: number)		{ this.floatArray[StateIndex.BALL_Y] = value; }
	set speedX(value: number)		{ this.floatArray[StateIndex.SPEED_X] = value; }
	set speedY(value: number)		{ this.floatArray[StateIndex.SPEED_Y] = value; }
	set player1Score(value: number)	{ this.intArray[StateIndex.PLAYER1_SCORE] = value; }
	set player2Score(value: number)	{ this.intArray[StateIndex.PLAYER2_SCORE] = value; }
}
