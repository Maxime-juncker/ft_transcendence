import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MatchModule", (m) => {
  const ctr = m.contract("Match");

  return { ctr };
});