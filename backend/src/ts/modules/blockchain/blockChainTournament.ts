import { createWalletClient, createPublicClient, WalletClient, http, defineChain, Hex, PublicClient, Address } from 'viem';
import { Abi } from 'abitype';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { promises as fs } from 'fs';
import { createSecret, readSecret } from 'modules/vault/vault.js';
import { Logger } from 'modules/logger.js';
import { Mutex } from 'async-mutex';

const TOURNAMENT_PATH = "./ts/modules/blockchain/artifacts/blockchain/contracts/Tournament.sol/Tournament.json";
const FACTORY_PATH = "./ts/modules/blockchain/artifacts/blockchain/contracts/Factory.sol/Factory.json";
const PKEY = process.env.PRIVATE_KEY
const RPC_URL = process.env.AVAX_INFURA

export class BlockchainContract {
    private abi: Abi | undefined;
    private tournamentAbi: Abi | undefined;
    private bytecode: Hex | undefined;
    private account: PrivateKeyAccount | undefined;
    private walletClient: WalletClient | undefined;
    private publicClient: PublicClient | undefined;
    private factoryAddress: Hex | undefined;
    private nonce: number = 0;
    private mutex = new Mutex();

    constructor() {}
    
    async init() {
            let data = await fs.readFile(FACTORY_PATH, 'utf-8');
            const FactoryArtifact = JSON.parse(data);
            data = await fs.readFile(TOURNAMENT_PATH, 'utf-8');
            const TournamentArtifact = JSON.parse(data);
            this.abi = FactoryArtifact.abi as Abi;
            this.tournamentAbi = TournamentArtifact.abi as Abi;
            this.bytecode = FactoryArtifact.bytecode as Hex;
            this.account = privateKeyToAccount(PKEY as `0x${string}`);
            this.walletClient = createWalletClient({
                account: this.account,
                chain: avalancheFuji,
                transport: http(RPC_URL),
            });
            this.publicClient = createPublicClient({
                chain: avalancheFuji,
                transport: http(RPC_URL),
            });
            await this.deployFactory();
            this.nonce = await this.publicClient.getTransactionCount({
                address: this.account!.address,
                blockTag: "pending"
            });
    }

    async deployFactory() {
        const factoryAddress = await readSecret('factoryAddress');
        if (factoryAddress) {
            this.factoryAddress = factoryAddress.value as Hex;
            Logger.log("factory address found in vault: ", this.factoryAddress);
        } else {
            const hash = await this.walletClient!.deployContract({
                abi: this.abi!,
                account: this.account!,
                bytecode: this.bytecode!,
                chain: avalancheFuji,
            });
            Logger.log("Factory deployment transaction hash: ", hash);
            
            const receipt = await this.publicClient!.waitForTransactionReceipt({ hash });
            if (!receipt.contractAddress) {
                throw ("failed to instatiate factory")
            }
            this.factoryAddress = receipt.contractAddress;
            createSecret('factoryAddress', {value: receipt.contractAddress});
            Logger.log("factory deployed to: ", this.factoryAddress);
        }
    }

    async createTournament(): Promise<number> {
        Logger.log("Creating tournament");
        let nonceToUse: number;
        await this.mutex.runExclusive(async () => {
            nonceToUse = this.nonce;
            this.nonce++;
        })
        try {
            const { result , request } = await this.publicClient!.simulateContract({
                account: this.account,
                address: this.factoryAddress!,
                abi: this.abi!,
                functionName: 'createTournament',
                nonce: nonceToUse!,
            })
            
            let hash = await this.walletClient!.writeContract(request);
            await this.publicClient!.waitForTransactionReceipt({ hash });
            Logger.log("Tournament created at : ", result);
            
            return (result);
        } catch (err) {
            this.nonce = await this.publicClient!.getTransactionCount({
                address: this.account!.address,
                blockTag: "pending"
            });
            throw err;
        }
    }

    async addMatchResult(tournamentId: number, player1: number, player2: number, player1score: number, player2score: number) {
        let tournamentAddress = await this.publicClient!.readContract({
            address: this.factoryAddress!,
            abi: this.abi!,
            functionName: 'getTournament',
            args: [tournamentId],
        })
        let nonceToUse: number;
        await this.mutex.runExclusive(async () => {
            nonceToUse = this.nonce;
            this.nonce++;
        })
        try {
            const { request } = await this.publicClient!.simulateContract({
                account: this.account,
                address: tournamentAddress as Hex,
                abi: this.tournamentAbi!,
                functionName: 'addMatch',
                args: [player1, player2, player1score, player2score],
                nonce: nonceToUse!,
            })
            let hash = await this.walletClient!.writeContract(request);
            await this.publicClient!.waitForTransactionReceipt({ hash });
            Logger.log("Match added on-chain : ", hash);
        } catch (err) {
            this.nonce = await this.publicClient!.getTransactionCount({
                address: this.account!.address,
                blockTag: "pending"
            });
            throw err;
        }
    }

    async finishTournament(tournamentId: number, winner: number) {

        let tournamentAddress = await this.publicClient!.readContract({
            address: this.factoryAddress!,
            abi: this.abi!,
            functionName: 'getTournament',
            args: [tournamentId],
        })
        let nonceToUse: number;
        await this.mutex.runExclusive(async () => {
            nonceToUse = this.nonce;
            this.nonce++;
        })
        try {
            const { request } = await this.publicClient!.simulateContract({
                account: this.account,
                address: tournamentAddress as Hex,
                abi: this.tournamentAbi!,
                functionName: 'finish',
                args: [winner],
                nonce: nonceToUse!,
            })
            let hash = await this.walletClient!.writeContract(request);
            const receipt = await this.publicClient!.waitForTransactionReceipt({ hash });
            Logger.log("Tournament finished : ", receipt);
        } catch (err) {
            this.nonce = await this.publicClient!.getTransactionCount({
                address: this.account!.address,
                blockTag: "pending"
            });
            throw err;
        }
    }

    async getTournaments() : Promise<Map<Hex, number>> {
        const Tournaments = await this.publicClient!.readContract({
            address: this.factoryAddress!,
            abi: this.abi!,
            functionName: 'getAllTournaments',
        }) as `0x${string}[]`;
        let returnValue: Map<Hex, number> = new Map();
        for (let i = 0; i < Tournaments.length; i++) {
            let address: Hex = Tournaments[i] as Hex;
            let winner = await this.publicClient!.readContract({
                address: address,
                abi: this.tournamentAbi!,
                functionName: 'get_winner',
            }) as number;
            if (winner)
                returnValue.set(address, winner);
        }
        return (returnValue);
    }
}