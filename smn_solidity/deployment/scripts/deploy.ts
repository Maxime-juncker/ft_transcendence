import 'dotenv/config';
import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import FactoryArtifact from '../artifacts/contracts/Factory.sol/Factory.json';

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


async function main() {

    const abi = FactoryArtifact.abi;
    const bytecode = FactoryArtifact.bytecode as `0x${string}`;
    const account = privateKeyToAccount(PKEY as `0x${string}`);
    const walletClient = createWalletClient({
        account,
        chain: hardhatLocal,
        transport: http(),
    });
    const hash = await walletClient.deployContract({
        abi,
        bytecode,
    });

    console.log("Transaction hash: ", hash);

    const publicClient = createPublicClient({
        chain: hardhatLocal,
        transport: http(),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const FactoryAddress = receipt.contractAddress;

    console.log("factory deployed to: ", FactoryAddress);

}
// dotenv.config()

// require('dotenv').config()

main().catch(console.error);