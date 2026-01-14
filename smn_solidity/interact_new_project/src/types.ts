import { InterfaceAbi } from "ethers";

export interface MatchContract {
    set_last_result(player1: string, score1: number, player2: string, score2: number): Promise<void>; 
}

export const gameABI: InterfaceAbi = ([
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "result_updated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "player1",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "score1",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "player2",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "score2",
          "type": "uint8"
        }
      ],
      "name": "set_last_result",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]) as const;