import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import PolygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import EthereumUniswapV2 from "@optyfi/defi-legos/ethereum/uniswapV2/index";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import PolygonSushiswapExports from "@optyfi/defi-legos/polygon/sushiswap/index";
import PolygonQuickswapExports from "@optyfi/defi-legos/polygon/quickswap/index";
import { eEthereumNetwork, ePolygonNetwork } from "../helpers/types";
import { Signers } from "./types";
import { OptyFiOracle, TestDeFiAdapter, UniswapV2ExchangeAdapter } from "../typechain";
import { TokenPairPriceFeedStruct } from "../typechain/OptyFiOracle";
import { shouldBehaveLikeUniswapV2ExchangeAdapter } from "./UniswapV2Exchange.behaviour";

const uniswapV2EthereumTestPools = ["USDC-ETH", "DAI-USDC", "ETH-USDT", "UNI-ETH", "PAXG-ETH", "FXS-FRAX"];

const sushiswapEthereumTestPools = [
  "ILV-ETH",
  "USDC-ETH",
  "USDC-ETH",
  "ETH-USDT",
  "WBTC-ETH",
  "SUSHI-WETH",
  "TOKE-ETH",
  "ALCX-WETH",
  "DAI-ETH",
];

const sushiswapPolygonTestPools = ["MATIC-WETH", "USDC-WETH", "TUSD-USDC", "USDC-USDT"];

const quickswapPolygonTestPools = [
  "WETH-DAI",
  "WETH-USDT",
  "WBTC-WETH",
  "WMATIC-WETH",
  "USDC-miMATIC",
  "USDC-USDT",
  "USDC-WETH",
  "WMATIC-USDC",
];

const priceFeeds: { [key: string]: TokenPairPriceFeedStruct[] } = {
  [eEthereumNetwork.mainnet]: [
    {
      priceFeed: "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4",
      tokenA: EthereumTokens.PLAIN_TOKENS.USDC,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
      tokenA: EthereumTokens.PLAIN_TOKENS.DAI,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    {
      priceFeed: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      tokenA: EthereumTokens.PLAIN_TOKENS.USDC,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    {
      priceFeed: "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      tokenA: EthereumTokens.PLAIN_TOKENS.USDT,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0xD6aA3D25116d8dA79Ea0246c4826EB951872e02e",
      tokenA: EthereumTokens.REWARD_TOKENS.UNI,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0x9B97304EA12EFed0FAd976FBeCAad46016bf269e",
      tokenA: EthereumTokens.PLAIN_TOKENS.PAXG,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0x6Ebc52C8C1089be9eB3945C4350B68B8E4C2233f",
      tokenA: EthereumTokens.PLAIN_TOKENS.FXS,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    {
      priceFeed: "0xB9E1E3A9feFf48998E45Fa90847ed4D467E8BcfD",
      tokenA: EthereumTokens.PLAIN_TOKENS.FRAX,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    {
      priceFeed: "0xf600984CCa37cd562E74E3EE514289e3613ce8E4",
      tokenA: EthereumTokens.REWARD_TOKENS.ILV,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
      tokenA: EthereumTokens.BTC_TOKENS.WBTC,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0xAc559F25B1619171CbC396a50854A3240b6A4e99",
      tokenA: EthereumTokens.WRAPPED_TOKENS.WETH,
      tokenB: EthereumTokens.BTC_TOKENS.WBTC,
    },
    {
      priceFeed: "0xe572CeF69f43c2E488b33924AF04BDacE19079cf",
      tokenA: EthereumTokens.REWARD_TOKENS.SUSHI,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      tokenA: EthereumTokens.WRAPPED_TOKENS.WETH,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    {
      priceFeed: "0x104cD02b2f22972E8d8542867a36bDeDA4f104d8",
      tokenA: EthereumTokens.REWARD_TOKENS.TOKE,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    {
      priceFeed: "0x194a9AaF2e0b67c35915cD01101585A33Fe25CAa",
      tokenA: EthereumTokens.REWARD_TOKENS.ALCX,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0x773616E4d11A78F511299002da57A0a94577F1f4",
      tokenA: EthereumTokens.PLAIN_TOKENS.DAI,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
  ],
  [ePolygonNetwork.polygon]: [
    {
      priceFeed: "0x327e23A4855b6F663a28c5161541d69Af8973302",
      tokenA: PolygonTokens.WMATIC,
      tokenB: PolygonTokens.WETH,
    },
    {
      priceFeed: "0xefb7e6be8356cCc6827799B6A7348eE674A80EaE",
      tokenA: PolygonTokens.USDC,
      tokenB: PolygonTokens.WETH,
    },
    {
      priceFeed: "0x7C5D415B64312D38c56B54358449d0a4058339d2",
      tokenA: "0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756",
      tokenB: PolygonTokens.USD,
    },
    {
      priceFeed: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
      tokenA: PolygonTokens.USDC,
      tokenB: PolygonTokens.USD,
    },
    {
      priceFeed: "0x0A6513e40db6EB1b165753AD52E80663aeA50545",
      tokenA: PolygonTokens.USDT,
      tokenB: PolygonTokens.USD,
    },
    {
      priceFeed: "0xFC539A559e170f848323e19dfD66007520510085",
      tokenA: PolygonTokens.DAI,
      tokenB: PolygonTokens.WETH,
    },
    {
      priceFeed: "0xf9d5AAC6E5572AEFa6bd64108ff86a222F69B64d",
      tokenA: PolygonTokens.USDT,
      tokenB: PolygonTokens.WETH,
    },
    {
      priceFeed: "0xA338e0492B2F944E9F8C0653D3AD1484f2657a37",
      tokenA: PolygonTokens.WBTC,
      tokenB: PolygonTokens.WETH,
    },
    {
      priceFeed: "0xd8d483d813547CfB624b8Dc33a00F2fcbCd2D428",
      tokenA: PolygonTokens.MIMATIC,
      tokenB: PolygonTokens.USD,
    },
    {
      priceFeed: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
      tokenA: PolygonTokens.WMATIC,
      tokenB: PolygonTokens.USD,
    },
  ],
};

describe("Swap Adapters", function () {
  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.alice = signers[1];
    this.signers.deployer = signers[2];
    this.signers.operator = signers[8];
    this.signers.riskOperator = signers[9];
    const registryArtifact: Artifact = await artifacts.readArtifact("IAdapterRegistryBase");
    this.mockRegistry = await waffle.deployMockContract(this.signers.deployer, registryArtifact.abi);
    await this.mockRegistry.mock.getOperator.returns(this.signers.operator.address);
    await this.mockRegistry.mock.getRiskOperator.returns(this.signers.riskOperator.address);
    this.testDeFiAdapterArtifact = await artifacts.readArtifact("TestDeFiAdapter");

    const optyFiOracleArtifact: Artifact = await artifacts.readArtifact("OptyFiOracle");
    this.optyFiOracle = <OptyFiOracle>(
      await waffle.deployContract(this.signers.deployer, optyFiOracleArtifact, ["86400", "86400"])
    );

    if (process.env.FORK === eEthereumNetwork.mainnet) {
      const tx = await this.optyFiOracle
        .connect(this.signers.deployer)
        .setChainlinkPriceFeed(priceFeeds[eEthereumNetwork.mainnet]);
      await tx.wait(1);
    } else if (process.env.FORK === ePolygonNetwork.polygon) {
      const tx = await this.optyFiOracle
        .connect(this.signers.deployer)
        .setChainlinkPriceFeed(priceFeeds[ePolygonNetwork.polygon]);
      await tx.wait(1);
    }

    this.testDeFiAdapterForUniswapV2Exchange = <TestDeFiAdapter>(
      await waffle.deployContract(this.signers.deployer, this.testDeFiAdapterArtifact)
    );
  });

  describe("UniswapV2ExchangeAdapter", async function () {
    before(async function () {
      const uniswapV2ExchangeAdapterArtifact = await artifacts.readArtifact("UniswapV2ExchangeAdapter");
      if (process.env.FORK === eEthereumNetwork.mainnet) {
        this.uniswapV2ExchangeAdapterEthereum = <UniswapV2ExchangeAdapter>(
          await waffle.deployContract(this.signers.deployer, uniswapV2ExchangeAdapterArtifact, [
            this.mockRegistry.address,
            EthereumUniswapV2.router02.address,
            this.optyFiOracle.address,
          ])
        );

        this.sushiswapExchangeAdapterEthereum = <UniswapV2ExchangeAdapter>(
          await waffle.deployContract(this.signers.deployer, uniswapV2ExchangeAdapterArtifact, [
            this.mockRegistry.address,
            EthereumSushiswap.SushiswapRouter.address,
            this.optyFiOracle.address,
          ])
        );
      } else if (process.env.FORK === ePolygonNetwork.polygon) {
        this.sushiswapExchangeAdapterPolygon = <UniswapV2ExchangeAdapter>(
          await waffle.deployContract(this.signers.deployer, uniswapV2ExchangeAdapterArtifact, [
            this.mockRegistry.address,
            PolygonSushiswapExports.SushiswapRouter.address,
            this.optyFiOracle.address,
          ])
        );

        this.quickswapExchangeAdapterPolygon = <UniswapV2ExchangeAdapter>(
          await waffle.deployContract(this.signers.deployer, uniswapV2ExchangeAdapterArtifact, [
            this.mockRegistry.address,
            PolygonQuickswapExports.QuickswapRouter.address,
            this.optyFiOracle.address,
          ])
        );
      }
    });

    if (process.env.FORK === eEthereumNetwork.mainnet) {
      describe("uniswapV2ExchangeAdapterEthereum", async function () {
        for (const poolName of Object.keys(EthereumUniswapV2.liquidity.pools)) {
          if (uniswapV2EthereumTestPools.includes(poolName)) {
            shouldBehaveLikeUniswapV2ExchangeAdapter(
              EthereumUniswapV2.liquidity.pools[poolName as keyof typeof EthereumUniswapV2.liquidity.pools].token0,
              EthereumUniswapV2.liquidity.pools[poolName as keyof typeof EthereumUniswapV2.liquidity.pools].token1,
              EthereumUniswapV2.liquidity.pools[poolName as keyof typeof EthereumUniswapV2.liquidity.pools],
              poolName,
              "uniswapV2",
              EthereumUniswapV2.router02.address,
            );
            shouldBehaveLikeUniswapV2ExchangeAdapter(
              EthereumUniswapV2.liquidity.pools[poolName as keyof typeof EthereumUniswapV2.liquidity.pools].token1,
              EthereumUniswapV2.liquidity.pools[poolName as keyof typeof EthereumUniswapV2.liquidity.pools].token0,
              EthereumUniswapV2.liquidity.pools[poolName as keyof typeof EthereumUniswapV2.liquidity.pools],
              poolName,
              "uniswapV2",
              EthereumUniswapV2.router02.address,
            );
          }
        }
      });

      describe("sushiswapExchangeAdapterEthereum", async function () {
        for (const poolName of Object.keys(EthereumSushiswap.liquidity.pools)) {
          if (sushiswapEthereumTestPools.includes(poolName)) {
            shouldBehaveLikeUniswapV2ExchangeAdapter(
              EthereumSushiswap.liquidity.pools[poolName as keyof typeof EthereumSushiswap.liquidity.pools].token0,
              EthereumSushiswap.liquidity.pools[poolName as keyof typeof EthereumSushiswap.liquidity.pools].token1,
              EthereumSushiswap.liquidity.pools[poolName as keyof typeof EthereumSushiswap.liquidity.pools],
              poolName,
              "sushiswap",
              EthereumSushiswap.SushiswapRouter.address,
            );
            shouldBehaveLikeUniswapV2ExchangeAdapter(
              EthereumSushiswap.liquidity.pools[poolName as keyof typeof EthereumSushiswap.liquidity.pools].token1,
              EthereumSushiswap.liquidity.pools[poolName as keyof typeof EthereumSushiswap.liquidity.pools].token0,
              EthereumSushiswap.liquidity.pools[poolName as keyof typeof EthereumSushiswap.liquidity.pools],
              poolName,
              "sushiswap",
              EthereumSushiswap.SushiswapRouter.address,
            );
          }
        }
      });
    }

    if (process.env.FORK === ePolygonNetwork.polygon) {
      describe("sushiswapExchangeAdapterPolygon", async function () {
        for (const poolName of Object.keys(PolygonSushiswapExports.liquidity.pools)) {
          if (!sushiswapPolygonTestPools.includes(poolName)) {
            continue;
          }
          shouldBehaveLikeUniswapV2ExchangeAdapter(
            PolygonSushiswapExports.liquidity.pools[poolName as keyof typeof PolygonSushiswapExports.liquidity.pools]
              .token0,
            PolygonSushiswapExports.liquidity.pools[poolName as keyof typeof PolygonSushiswapExports.liquidity.pools]
              .token1,
            PolygonSushiswapExports.liquidity.pools[poolName as keyof typeof PolygonSushiswapExports.liquidity.pools],
            poolName,
            "sushiswap",
            PolygonSushiswapExports.SushiswapRouter.address,
          );
          shouldBehaveLikeUniswapV2ExchangeAdapter(
            PolygonSushiswapExports.liquidity.pools[poolName as keyof typeof PolygonSushiswapExports.liquidity.pools]
              .token1,
            PolygonSushiswapExports.liquidity.pools[poolName as keyof typeof PolygonSushiswapExports.liquidity.pools]
              .token0,
            PolygonSushiswapExports.liquidity.pools[poolName as keyof typeof PolygonSushiswapExports.liquidity.pools],
            poolName,
            "sushiswap",
            PolygonSushiswapExports.SushiswapRouter.address,
          );
        }
      });

      describe("quickswapExchangeAdapterPolygon", async function () {
        for (const poolName of Object.keys(PolygonQuickswapExports.liquidity.pools)) {
          if (!quickswapPolygonTestPools.includes(poolName)) {
            continue;
          }
          shouldBehaveLikeUniswapV2ExchangeAdapter(
            PolygonQuickswapExports.liquidity.pools[poolName as keyof typeof PolygonQuickswapExports.liquidity.pools]
              .token0,
            PolygonQuickswapExports.liquidity.pools[poolName as keyof typeof PolygonQuickswapExports.liquidity.pools]
              .token1,
            PolygonQuickswapExports.liquidity.pools[poolName as keyof typeof PolygonQuickswapExports.liquidity.pools],
            poolName,
            "quickswap",
            PolygonQuickswapExports.QuickswapRouter.address,
          );
          shouldBehaveLikeUniswapV2ExchangeAdapter(
            PolygonQuickswapExports.liquidity.pools[poolName as keyof typeof PolygonQuickswapExports.liquidity.pools]
              .token1,
            PolygonQuickswapExports.liquidity.pools[poolName as keyof typeof PolygonQuickswapExports.liquidity.pools]
              .token0,
            PolygonQuickswapExports.liquidity.pools[poolName as keyof typeof PolygonQuickswapExports.liquidity.pools],
            poolName,
            "quickswap",
            PolygonQuickswapExports.QuickswapRouter.address,
          );
        }
      });
    }
  });
});
