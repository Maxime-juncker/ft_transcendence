import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";
import { avalancheFuji } from "viem/chains";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    avalancheFuji: {
      type: "http",
      // url: configVariable("FUJI_RPC_URL"),
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      // chaintype: "l1",
      gasPrice: 225000000000,
      chainId: 43113,
      accounts: ['4f3a033dffe4bcf04cc33573231f76be08441a3e74c0bdda6252de9100a6a811'],
      // accounts: [configVariable("FUJI_PRIVATE_KEY")],
    }
  },
};

export default config;
