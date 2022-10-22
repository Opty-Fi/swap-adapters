import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Fixture, MockContract } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import { TestDeFiAdapter } from "../typechain";
import { UniswapV2PoolAdapter } from "../typechain/UniswapV2PoolAdapter";

export interface Signers {
  admin: SignerWithAddress;
  owner: SignerWithAddress;
  deployer: SignerWithAddress;
  alice: SignerWithAddress;
  bob: SignerWithAddress;
  charlie: SignerWithAddress;
  dave: SignerWithAddress;
  eve: SignerWithAddress;
  operator: SignerWithAddress;
  riskOperator: SignerWithAddress;
}

export interface PoolItem {
  pool: string;
  lpToken: string;
  stakingVault?: string;
  rewardTokens?: string[];
  tokens: string[];
  swap?: string;
  deprecated?: boolean;
  tokenIndexes: string[];
}

export interface LiquidityPool {
  [name: string]: PoolItem;
}

declare module "mocha" {
  export interface Context {
    uniswapV2PoolAdapter: UniswapV2PoolAdapter;
    testDeFiAdapterArtifact: Artifact;
    testDeFiAdapterForUniswapV2Pool: TestDeFiAdapter;
    mockRegistry: MockContract;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}
