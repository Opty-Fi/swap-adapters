import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";

// behaviour test files
import { shouldBehaveLikeCurveExchangeAdapter } from "./CurveExchangeAdapter.behaviour";

// types
import { Signers } from "./types";
import { CurveExchangeAdapter, TestDeFiAdapter } from "../typechain";

const testSwapPools = ["dai_3crv", "usdc_3crv", "usdt_3crv"];

describe("Swap Adapters", function () {
  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.alice = signers[1];
    this.signers.deployer = signers[2];
    this.signers.operator = signers[8];
    this.signers.riskOperator = signers[9];
    const registryArtifact: Artifact = await hre.artifacts.readArtifact("IAdapterRegistryBase");
    this.mockRegistry = await hre.waffle.deployMockContract(this.signers.deployer, registryArtifact.abi);
    await this.mockRegistry.mock.getOperator.returns(this.signers.operator.address);
    await this.mockRegistry.mock.getRiskOperator.returns(this.signers.riskOperator.address);
    this.testDeFiAdapterArtifact = await hre.artifacts.readArtifact("TestDeFiAdapter");
  });
  describe("CurveExchangeAdapter", function () {
    before(async function () {
      const curveExchangeAdapterArtifact: Artifact = await hre.artifacts.readArtifact("CurveExchangeAdapter");
      this.curveExchangeAdapter = <CurveExchangeAdapter>(
        await hre.waffle.deployContract(this.signers.deployer, curveExchangeAdapterArtifact, [
          this.mockRegistry.address,
          CurveExports.CurveRegistryExchange.address,
        ])
      );
      this.testDeFiAdapterForCurveExchange = <TestDeFiAdapter>(
        await hre.waffle.deployContract(this.signers.deployer, this.testDeFiAdapterArtifact)
      );
    });

    for (const poolName of Object.keys(CurveExports.CurveSwapPool)) {
      if (testSwapPools.includes(poolName)) {
        shouldBehaveLikeCurveExchangeAdapter(
          CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool],
        );
      }
    }
  });
});
