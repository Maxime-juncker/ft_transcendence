import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const {
    INFURA_API_KEY="",
    PRIVATE_KEY="",
    CONTRACT_ADDRESS="",
} = process.env;

const provider = new ethers.JsonRpcProvider(
  `https://avalanche-fuji.infura.io/v3/${INFURA_API_KEY}`
);

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contractAdress = CONTRACT_ADDRESS;

const contractABI = [
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
  ];

const contract = new ethers.Contract(contractAdress, contractABI, wallet);


async function main() {
    const tx = await contract.set_last_result("Michel", 32, "Bruno", 43);
    console.log("DONE : ");
    const hash = await tx.hash;
    console.log("tx hash : ", hash);
}

main();
