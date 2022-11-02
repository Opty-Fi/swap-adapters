import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// behaviour test files
import { shouldBehaveLikeUniswapPoolAdapter } from "./UniswapV2PoolAdapter.behaviour";

// types
import { TestDeFiAdapter } from "../typechain";
import { UniswapV2PoolAdapter } from "../typechain/UniswapV2PoolAdapter";

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
  describe.only("UniswapV2ExchangeAdapter", function () {
    before(async function () {
      const uniswapV2PoolAdapterArtifact: Artifact = await hre.artifacts.readArtifact("UniswapV2PoolAdapter");
      this.uniswapV2PoolAdapter = <UniswapV2PoolAdapter>(
        await hre.waffle.deployContract(this.signers.deployer, uniswapV2PoolAdapterArtifact, [
          this.mockRegistry.address,
        ])
      );
      this.testDeFiAdapterForUniswapV2Pool = <TestDeFiAdapter>(
        await hre.waffle.deployContract(this.signers.deployer, this.testDeFiAdapterArtifact)
      );
    });
    shouldBehaveLikeUniswapPoolAdapter();
  });
});
