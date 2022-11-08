import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";

// behaviour test files
import { shouldBehaveLikeCurveExchangeAdapter } from "./CurveExchangeAdapter.behaviour";

// types
import { Signers } from "./types";
import { CurveExchangeAdapter, ERC20, ERC20__factory, TestDeFiAdapter } from "../typechain";

const testSwapPools = ["dai+usdc+usdt_3crv"];

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
        ])
      );
      this.testDeFiAdapterForCurveExchange = <TestDeFiAdapter>(
        await waffle.deployContract(this.signers.deployer, this.testDeFiAdapterArtifact)
      );
    });

    for (const poolName of Object.keys(CurveExports.CurveSwapPool)) {
      if (testSwapPools.includes(poolName)) {
        shouldBehaveLikeCurveExchangeAdapter(
          CurveExports.CurveSwapPool[poolName as keyof typeof CurveExports.CurveSwapPool],
          poolName,
        );
      }
    }
  });
});
