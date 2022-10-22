import { HardhatNetworkForkingUserConfig } from "hardhat/types";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import { eEthereumNetwork, ePolygonNetwork } from "./helpers/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || "";
const MATIC_RPC_URL = process.env.MATIC_RPC_URL || "";
const MAIN_RPC_URL = process.env.MAIN_RPC_URL || "";
const FORK = process.env.FORK || "";
const FORK_BLOCK_NUMBER = process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : 0;

const GWEI = 30 * 1000 * 1000;

export const NETWORKS_RPC_URL: iParamsPerNetwork<string> = {
  [ePolygonNetwork.mumbai]: MUMBAI_RPC_URL,
  [ePolygonNetwork.matic]: MATIC_RPC_URL,
  [eEthereumNetwork.main]: MAIN_RPC_URL,
};

export const NETWORKS_DEFAULT_GAS: iParamsPerNetwork<number | "auto"> = {
  [ePolygonNetwork.mumbai]: 1 * GWEI,
  [ePolygonNetwork.matic]: "auto",
  [eEthereumNetwork.main]: "auto",
};

export const NETWORKS_CHAIN_ID: iParamsPerNetwork<number | "auto"> = {
  [ePolygonNetwork.mumbai]: 80001,
  [ePolygonNetwork.matic]: 137,
  [eEthereumNetwork.main]: 1,
};

export const BLOCK_TO_FORK = {
  [ePolygonNetwork.mumbai]: undefined,
  [ePolygonNetwork.matic]: 23858545,
  [eEthereumNetwork.main]: 15801206,
};

export const buildForkConfig = (): HardhatNetworkForkingUserConfig | undefined => {
  if (FORK) {
    const forkMode: HardhatNetworkForkingUserConfig = {
      url: NETWORKS_RPC_URL[FORK],
    };
    if (FORK_BLOCK_NUMBER || BLOCK_TO_FORK[FORK]) {
      forkMode.blockNumber = FORK_BLOCK_NUMBER || BLOCK_TO_FORK[FORK];
    }

    return forkMode;
  }
  return undefined;
};
