import 'dotenv/config';
import { createWalletClient, createPublicClient, WalletClient, http, defineChain, Hex, PublicClient, Address } from 'viem';
import { Abi } from 'abitype';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';

import FactoryArtifact from '../../../blockchain/artifacts/blockchain/contracts/Factory.sol/Factory.json';
import TournamentArtifact from '../../../blockchain/artifacts/blockchain/contracts/Tournament.sol/Tournament.json';


const PUBKEY = process.env.PUBLIC_KEY
const PKEY = process.env.PRIVATE_KEY

const hardhatLocal = defineChain({
    id: 31337,
    name: 'HardhatLocal',
    network: 'hardhat',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['http://127.0.0.1:8545'],
        },
    },
});

export class BlockchainContract {
    private abi: Abi;
    private tournamentAbi: Abi;
    private bytecode: Hex;
    private account: PrivateKeyAccount;
    private walletClient: WalletClient;
    private publicClient: PublicClient;
    private factoryAddress: Hex | undefined;

    constructor() {
        this.abi = FactoryArtifact.abi as Abi;
        this.tournamentAbi = TournamentArtifact.abi as Abi;
        this.bytecode = FactoryArtifact.bytecode as Hex;
        this.account = privateKeyToAccount(PKEY as `0x${string}`);
        this.walletClient = createWalletClient({
            account: this.account,
            chain: hardhatLocal,
            transport: http(),
        });
        this.publicClient = createPublicClient({
            chain: hardhatLocal,
            transport: http(),
        });
    }

    async deployFactory() {
        if (process.env.FACTORY_CONTRACT) {
            this.factoryAddress = process.env.FACTORY_CONTRACT as `0x${string}`;
            console.log("factory address found in vault: ", this.factoryAddress)
        } else {
            const hash = await this.walletClient.deployContract({
                abi: this.abi,
                account: this.account,
                bytecode: this.bytecode,
                chain: hardhatLocal,
            });
            
            console.log("Factory deployment transaction hash: ", hash);
            
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
            if (receipt.contractAddress == undefined) {
                throw ("failed to instatiate factory") 
            }
            this.factoryAddress = receipt.contractAddress;

            console.log("factory deployed to: ", this.factoryAddress);
        }
    }

    async createTournament(): Promise<number> {
        
        if (this.factoryAddress == undefined) {
            throw ("no factory address, cannot create Tournament")
        }

        console.log("Creating tournament")
        const { result , request } = await this.publicClient.simulateContract({
            account: this.account,
            address: this.factoryAddress,
            abi: this.abi,
            functionName: 'createTournament',
        })

        let hash = await this.walletClient.writeContract(request)

        console.log("Tournament created at : ", hash)
        return (result);
    }

    async addMatchResult(tournamentId: number, player1: string, player2: string, player1score: number, player2score: number) {
        if (this.factoryAddress == undefined) {
            throw ("no factory address, cannot add match")
        }

        let tournamentAddress = await this.publicClient.readContract({
            address: this.factoryAddress,
            abi: this.abi,
            functionName: 'getTournament',
            args: [tournamentId],
        })

        const { request } = await this.publicClient.simulateContract({
            account: this.account,
            address: tournamentAddress as Hex,
            abi: this.tournamentAbi,
            functionName: 'addMatch',
            args: [player1, player2, player1score, player2score],
        })

        await this.walletClient.writeContract(request);
    }

    async finishTournament(tournamentId: number, winner: string) {
        if (this.factoryAddress == undefined) {
            throw ("no factory address, cannot add match")
        }

        let tournamentAddress = await this.publicClient.readContract({
            address: this.factoryAddress,
            abi: this.abi,
            functionName: 'getTournament',
            args: [tournamentId],
        })

        const { request } = await this.publicClient.simulateContract({
            account: this.account,
            address: tournamentAddress as Hex,
            abi: this.tournamentAbi,
            functionName: 'finish',
            args: [winner],
        })

        await this.walletClient.writeContract(request);
    }
}

async function main() {

    let blockchainContract = new BlockchainContract();
    await blockchainContract.deployFactory();
    let id = await blockchainContract.createTournament();
}

main().catch(console.error);