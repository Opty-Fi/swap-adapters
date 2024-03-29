import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Fixture, MockContract } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import {
  CurveExchangeAdapter,
  CurveExchangeETHGateway,
  ICurveMetaRegistry,
  ICurveRegistryExchange,
  OptyFiOracle,
  TestDeFiAdapter,
  UniswapV2ExchangeAdapter,
} from "../typechain";

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
  lpToken?: string;
  stakingVault?: string;
  rewardTokens?: string[];
  tokens?: string[];
  swap?: string;
  deprecated?: boolean;
  tokenIndexes?: string[];
  token0?: string;
  token1?: string;
}

export interface LiquidityPool {
  [name: string]: PoolItem;
}

declare module "mocha" {
  export interface Context {
    uniswapV2ExchangeAdapterEthereum: UniswapV2ExchangeAdapter;
    sushiswapExchangeAdapterEthereum: UniswapV2ExchangeAdapter;
    sushiswapExchangeAdapterPolygon: UniswapV2ExchangeAdapter;
    quickswapExchangeAdapterPolygon: UniswapV2ExchangeAdapter;
    testDeFiAdapterForUniswapV2Exchange: TestDeFiAdapter;
    curveExchangeAdapter: CurveExchangeAdapter;
    curveExchangeETHGateway: CurveExchangeETHGateway;
    testDeFiAdapterForCurveExchange: TestDeFiAdapter;
    testDeFiAdapterArtifact: Artifact;
    curveMetaRegistry: ICurveMetaRegistry;
    curveRegistryExchange: ICurveRegistryExchange;
    optyFiOracleArtifact: Artifact;
    optyFiOracle: OptyFiOracle;
    mockRegistry: MockContract;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}
