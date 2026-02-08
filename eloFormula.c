#include <stdio.h>
#include <stdlib.h>
#include <math.h>

void	formula(float elo1, float elo2, unsigned int score1, unsigned int score2)
{
	const float K = 20;
	const unsigned short scaleFactor = 420;
	const float expectedScore = 1.0 / (1.0 + pow(10, (elo2 - elo1) / scaleFactor));
	const int diffScore = abs(score1 - score2);
	const int maxPoint = 11;
	const float gap = 0.5 + (float)(diffScore - 1) * (float)(1.0 / (maxPoint - 1));
	const float score = K * gap * (1 - expectedScore);

	elo1 += score;
	elo2 -= score;

	printf("Expected score for player 1: %.2f\n", expectedScore);
	printf("Score difference: %d\n", diffScore);
	printf("Gap: %.2f\n", gap);
	printf("Score change: %.2f\n\n", score);
	printf("New Elo for player 1: %.2f\n", elo1);
	printf("New Elo for player 2: %.2f\n", elo2);
}

int	main(int argc, char **argv)
{
	if (argc != 5)
	{
		dprintf(2, "Usage: %s <elo1> <elo2> <score1> <score2>\n", argv[0]);
		return (1);
	}

	formula(atof(argv[1]), atof(argv[2]), atoi(argv[3]), atoi(argv[4]));
	return (0);
}
