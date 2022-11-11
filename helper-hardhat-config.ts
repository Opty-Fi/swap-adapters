import { HardhatNetworkForkingUserConfig } from "hardhat/types";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import { eEthereumNetwork, eNetwork, ePolygonNetwork, iParamsPerNetwork } from "./helpers/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const POLYGON_RPC_URL = process.env.POLYGON_NODE_URL || "";
const MAIN_RPC_URL = process.env.MAIN_RPC_URL || "";
const FORK_BLOCK_NUMBER = process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : 0;

export const NETWORKS_RPC_URL: iParamsPerNetwork<string> = {
  [ePolygonNetwork.polygon]: POLYGON_RPC_URL,
  [eEthereumNetwork.mainnet]: MAIN_RPC_URL,
};

export const NETWORKS_DEFAULT_GAS: iParamsPerNetwork<number | "auto"> = {
  [ePolygonNetwork.polygon]: "auto",
  [eEthereumNetwork.mainnet]: "auto",
};

export const NETWORKS_CHAIN_ID: iParamsPerNetwork<number | "auto"> = {
  [ePolygonNetwork.polygon]: 137,
  [eEthereumNetwork.mainnet]: 1,
};

export const BLOCK_TO_FORK = {
  [ePolygonNetwork.polygon]: 23858545,
  [eEthereumNetwork.mainnet]: 15934025,
};

export const buildForkConfig = (fork: eNetwork): HardhatNetworkForkingUserConfig | undefined => {
  if (fork) {
    const forkMode: HardhatNetworkForkingUserConfig = {
      url: NETWORKS_RPC_URL[fork as eNetwork],
    };
    if (FORK_BLOCK_NUMBER || BLOCK_TO_FORK[fork]) {
      forkMode.blockNumber = FORK_BLOCK_NUMBER || BLOCK_TO_FORK[fork];
    }

    return forkMode;
  }
  return undefined;
};
