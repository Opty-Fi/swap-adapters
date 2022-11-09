import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { eEthereumNetwork } from "../helpers/types";
import { Signers } from "./types";

// uniswapv2 ethereum
// "USDC-ETH": {
//     pool: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
//     token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
//     token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
// },
// "DAI-USDC": {
//     pool: "0xAE461cA67B15dc8dc81CE7615e0320dA1A9aB8D5",
//     token0: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
//     token1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
// },
// "ETH-USDT": {
//     pool: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852",
//     token0: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//     token1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
// },
// "UNI-ETH": {
//     pool: "0xd3d2E2692501A5c9Ca623199D38826e513033a17",
//     token0: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
//     token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
// },
// "PAXG-ETH": {
//     pool: "0x9C4Fe5FFD9A9fC5678cFBd93Aa2D4FD684b67C4C",
//     token0: "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
//     token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
// },
// "FXS-FRAX": {
//     pool: "0xE1573B9D29e2183B1AF0e743Dc2754979A40D237",
//     token0: "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0",
//     token1: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
// },

const priceFeeds = {
  [eEthereumNetwork.mainnet]: {
    USDC_ETH_FEED: {
      feed: "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4",
      tokenA: EthereumTokens.PLAIN_TOKENS.USDC,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    DAI_USD_FEED: {
      feed: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
      tokenA: EthereumTokens.PLAIN_TOKENS.DAI,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    USDC_USD_FEED: {
      feed: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      tokenA: EthereumTokens.PLAIN_TOKENS.USDC,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    USDT_ETH_FEED: {
      feed: "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      tokenA: EthereumTokens.PLAIN_TOKENS.USDC,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    UNI_ETH_FEED: {
      feed: "0xD6aA3D25116d8dA79Ea0246c4826EB951872e02e",
      tokenA: EthereumTokens.REWARD_TOKENS.UNI,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    PAXG_ETH_FEED: {
      feed: "0x9B97304EA12EFed0FAd976FBeCAad46016bf269e",
      tokenA: EthereumTokens.PLAIN_TOKENS.PAXG,
      tokenB: EthereumTokens.WRAPPED_TOKENS.WETH,
    },
    FXS_USD_FEED: {
      feed: "0x6Ebc52C8C1089be9eB3945C4350B68B8E4C2233f",
      tokenA: EthereumTokens.PLAIN_TOKENS.FXS,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
    FRAX_USD_FEED: {
      feed: "0xB9E1E3A9feFf48998E45Fa90847ed4D467E8BcfD",
      tokenA: EthereumTokens.PLAIN_TOKENS.FRAX,
      tokenB: EthereumTokens.PLAIN_TOKENS.USD,
    },
  },
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
  });
});
