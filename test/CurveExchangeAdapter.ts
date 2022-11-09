import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";

// behaviour test files
import { shouldBehaveLikeCurveExchangeAdapter } from "./CurveExchangeAdapter.behaviour";

// types
import { Signers } from "./types";
import { CurveExchangeAdapter, TestDeFiAdapter } from "../typechain";

const testSwapPoolsA = [
  "dai_3crv",
  "usdc_3crv",
  "usdt_3crv",
  "slink_link+slink",
  "eth_eth+seth",
  "seth_eth+seth",
  "eth_eth+steth",
  "steth_eth+steth",
];
const testSwapPoolsB = [
  "dai+usdc+usdt_3crv",
  "wbtc+renbtc_crvRenWBTC",
  "link+slink",
  "eth+steth",
  "eth+seth",
  "eth+reth",
];

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
  });
  describe("CurveExchangeAdapter", async function () {
    before(async function () {
      const curveExchangeAdapterArtifact: Artifact = await artifacts.readArtifact("CurveExchangeAdapter");
      this.curveExchangeAdapter = <CurveExchangeAdapter>(
        await waffle.deployContract(this.signers.deployer, curveExchangeAdapterArtifact, [
          this.mockRegistry.address,
          CurveExports.CurveRegistryExchange.address,
          CurveExports.CurveMetaRegistry.address,
          EthereumTokens.WRAPPED_TOKENS.WETH,
          EthereumTokens.PLAIN_TOKENS.ETH,
          CurveExports.CurveSwapPool["seth_eth+seth"].pool,
          CurveExports.CurveSwapPool["aethc_eth+aethc"].pool,
          CurveExports.CurveSwapPool["reth_eth+reth"].pool,
          CurveExports.CurveSwapPool["steth_eth+steth"].pool,
        ])
      );
      this.testDeFiAdapterForCurveExchange = <TestDeFiAdapter>(
        await waffle.deployContract(this.signers.deployer, this.testDeFiAdapterArtifact)
      );
    });

    for (const poolName of Object.keys(CurveExports.CurveSwapPool)) {
      if (testSwapPoolsA.includes(poolName)) {
        shouldBehaveLikeCurveExchangeAdapter(
          CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool],
          poolName,
          CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool].lpToken,
          CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool].tokens[0],
        );
      }
    }
    for (const poolName of Object.keys(CurveExports.CurveSwapPool)) {
      if (testSwapPoolsB.includes(poolName)) {
        for (const tokenO of CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool].tokens) {
          for (const tokenI of CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool].tokens) {
            if (tokenI == tokenO) {
              continue;
            }
            shouldBehaveLikeCurveExchangeAdapter(
              CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool],
              poolName,
              tokenI,
              tokenO,
            );
          }
        }
      }
    }
  });
});
