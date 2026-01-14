// src/index.ts
import { Contract, ethers } from "ethers";
import dotenv from "dotenv";
import { MatchContract, gameABI } from "./types";

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

const contract: MatchContract = new ethers.Contract(
    CONTRACT_ADDRESS, gameABI, wallet
);



async function set_last_result(player1: string, score1: number, player2: string, score2: number) : Promise<void> {
    try {
        const tx = await contract.set_last_result(player1, score1, player2, score2);
        console.log("Transaction sent : ", tx.hash);
        await tx.wait();
        console.log("Tx confirmed");
    }
    catch (error){
        console.error("Error setting last result", error);
    }
}

(async () => {
  await set_last_result("Nicolas", 32, "Junior", 44);
})();