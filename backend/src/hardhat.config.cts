import { defineConfig } from "hardhat/config";

export default defineConfig({
  paths: {
    sources: "./blockchain/contracts",
    artifacts: "./blockchain/artifacts",
  },
  solidity: {
    version: "0.8.28",
  },
  networks: {

  }
});
