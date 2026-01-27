import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  paths: {
    sources: "./blockchain/contracts",
    artifacts: "./ts/modules/blockchain/artifacts",
  },
  solidity: {
    version: "0.8.28",
  },
  networks: {
    avax_fuji: {
      type: "http",
      chainType: "l1",
      chainId: 43113,
      url: configVariable("AVAX_INFURA"),
    }
  }
});