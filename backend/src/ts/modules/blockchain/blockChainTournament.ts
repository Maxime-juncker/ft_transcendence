import { createWalletClient, createPublicClient, WalletClient, http, defineChain, Hex, PublicClient, Address } from 'viem';
import { Abi } from 'abitype';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { promises as fs } from 'fs';

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
            this.deployFactory();
    }

    async deployFactory() {
        if (process.env.FACTORY_CONTRACT) {
            this.factoryAddress = process.env.FACTORY_CONTRACT as `0x${string}`;
            console.log("factory address found in vault: ", this.factoryAddress)
        } else {
            const hash = await this.walletClient!.deployContract({
                abi: this.abi!,
                account: this.account!,
                bytecode: this.bytecode!,
                chain: avalancheFuji,
            });
            
            console.log("Factory deployment transaction hash: ", hash);
            
            const receipt = await this.publicClient!.waitForTransactionReceipt({ hash });
            if (receipt.contractAddress == undefined) {
                throw ("failed to instatiate factory")
            }
            console.log("receipt: ", receipt);
            this.factoryAddress = receipt.contractAddress;

            console.log("factory deployed to: ", this.factoryAddress);
        }
    }

    async createTournament(): Promise<number> {
        console.log("Creating tournament");
        const { result , request } = await this.publicClient!.simulateContract({
            account: this.account,
            address: this.factoryAddress!,
            abi: this.abi!,
            functionName: 'createTournament',
        })

        let hash = await this.walletClient!.writeContract(request);
        const receipt = await this.publicClient!.waitForTransactionReceipt({ hash });

        console.log("Tournament created at : ", result);

        // await this.addMatchResult(0, 15, 16, 2, 2);

        // await this.finishTournament(0, "jean-paul");
        return (result);
    }

    async addMatchResult(tournamentId: number, player1: number, player2: number, player1score: number, player2score: number) {
        let tournamentAddress = await this.publicClient!.readContract({
            address: this.factoryAddress!,
            abi: this.abi!,
            functionName: 'getTournament',
            args: [tournamentId],
        })

        const { request } = await this.publicClient!.simulateContract({
            account: this.account,
            address: tournamentAddress as Hex,
            abi: this.tournamentAbi!,
            functionName: 'addMatch',
            args: [player1, player2, player1score, player2score],
        })

        let hash = await this.walletClient!.writeContract(request);
        const receipt = await this.publicClient!.waitForTransactionReceipt({ hash });
        console.log("Match added on-chain : ", hash);
    }

    async finishTournament(tournamentId: number, winner: string) {

        let tournamentAddress = await this.publicClient!.readContract({
            address: this.factoryAddress!,
            abi: this.abi!,
            functionName: 'getTournament',
            args: [tournamentId],
        })

        const { request } = await this.publicClient!.simulateContract({
            account: this.account,
            address: tournamentAddress as Hex,
            abi: this.tournamentAbi!,
            functionName: 'finish',
            args: [winner],
        })

        let hash = await this.walletClient!.writeContract(request);
        const receipt = await this.publicClient!.waitForTransactionReceipt({ hash });
        console.log("Tournament finished : ", receipt);
    }

    async getTournaments() : Promise<[Hex, string][]> {
        const Tournaments = await this.publicClient!.readContract({
            address: this.factoryAddress!,
            abi: this.abi!,
            functionName: 'getAllTournaments',
        }) as `0x${string}[]`;
        // console.log(Tournaments);
        // Tournaments = Tournaments as string[];
        // console.log(Tournaments.length);
        let returnValue: [Hex, string][] = [];
        for (let i = 0; i < Tournaments.length; i++) {
            let address: Hex = Tournaments[i] as Hex;
            let winner = await this.publicClient!.readContract({
                address: address,
                abi: this.tournamentAbi!,
                functionName: 'get_winner',
            }) as string;
            // console.log("winner: ", winner);
            let value: [Hex, string] = [address, winner];
            returnValue.push(value);
        }
        return (returnValue);
    }
}