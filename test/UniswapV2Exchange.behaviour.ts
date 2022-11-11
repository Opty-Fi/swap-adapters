import { expect } from "chai";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import PolygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import WETHAbi from "@optyfi/defi-legos/interfaces/misc/abi/WETH.json";
import { eEthereumNetwork, ePolygonNetwork } from "../helpers/types";
import { ERC20, ERC20__factory, OptyFiOracle, UniswapV2ExchangeAdapter } from "../typechain";
import { PoolItem } from "./types";
import { setTokenBalanceInStorage } from "./utils";
import { BigNumber } from "ethers";

const DAI_WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
const USDT_WHALE = "0x5041ed759Dd4aFc3a72b8192C143F72f4724081A";

export function shouldBehaveLikeUniswapV2ExchangeAdapter(
  inputToken: string,
  outputToken: string,
  poolItem: PoolItem,
  poolName: string,
  adapter: string,
  router: string,
): void {
  it("", async function () {
    const adapterInstances: { [key: string]: { [name: string]: UniswapV2ExchangeAdapter } } = {
      [eEthereumNetwork.mainnet]: {
        uniswapV2: this.uniswapV2ExchangeAdapterEthereum,
        sushiswap: this.sushiswapExchangeAdapterEthereum,
      },
      [ePolygonNetwork.polygon]: {
        sushiswap: this.sushiswapExchangeAdapterPolygon,
        quickswap: this.quickswapExchangeAdapterPolygon,
      },
    };

    const adapterInstance: UniswapV2ExchangeAdapter =
      adapterInstances[process.env.FORK as string as keyof typeof adapterInstance][adapter];

    const inputTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, inputToken);
    const outputTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, outputToken);
    const inputTokenSymbol = await inputTokenInstance.symbol();
    const outputTokenSymbol = await outputTokenInstance.symbol();
    this._runnable.title = `should swap ${inputTokenSymbol} and reverse swap ${outputTokenSymbol} in ${poolName} pool of ${adapter}`;

    let tx = await this.testDeFiAdapterForUniswapV2Exchange.revokeAllowances(
      [inputTokenInstance.address, outputTokenInstance.address],
      [router, router],
    );
    await tx.wait(1);

    tx = await this.testDeFiAdapterForUniswapV2Exchange.giveAllowances(
      [inputTokenInstance.address, outputTokenInstance.address],
      [router, router],
    );
    await tx.wait(1);

    if (
      process.env.FORK === eEthereumNetwork.mainnet &&
      getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)
    ) {
      const wethInstance = await ethers.getContractAt(WETHAbi, inputTokenInstance.address);
      tx = await wethInstance.connect(this.signers.deployer).deposit({ value: parseEther("20") });
      await tx.wait(1);
      tx = await wethInstance
        .connect(this.signers.deployer)
        .transfer(this.testDeFiAdapterForUniswapV2Exchange.address, parseEther("20"));
    } else if (
      process.env.FORK === eEthereumNetwork.mainnet &&
      getAddress(inputTokenInstance.address) == getAddress(EthereumTokens.PLAIN_TOKENS.DAI)
    ) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [DAI_WHALE],
      });
      const whaleSigner = await ethers.getSigner(DAI_WHALE);
      tx = await inputTokenInstance
        .connect(whaleSigner)
        .transfer(
          this.testDeFiAdapterForUniswapV2Exchange.address,
          parseUnits("20", await inputTokenInstance.decimals()),
        );
      await tx.wait(1);
    } else if (
      process.env.FORK === eEthereumNetwork.mainnet &&
      getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.PLAIN_TOKENS.USDT)
    ) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [USDT_WHALE],
      });
      const whaleSigner = await ethers.getSigner(USDT_WHALE);
      tx = await inputTokenInstance
        .connect(whaleSigner)
        .transfer(
          this.testDeFiAdapterForUniswapV2Exchange.address,
          parseUnits("20", await inputTokenInstance.decimals()),
        );
      await tx.wait(1);
    } else if (
      process.env.FORK === ePolygonNetwork.polygon &&
      getAddress(inputTokenInstance.address) === getAddress(PolygonTokens.WMATIC)
    ) {
      const wethInstance = await ethers.getContractAt(WETHAbi, inputTokenInstance.address);
      tx = await wethInstance.connect(this.signers.deployer).deposit({ value: parseEther("20") });
      await tx.wait(1);
      tx = await wethInstance
        .connect(this.signers.deployer)
        .transfer(this.testDeFiAdapterForUniswapV2Exchange.address, parseEther("20"));
    } else {
      await setTokenBalanceInStorage(inputTokenInstance, this.testDeFiAdapterForUniswapV2Exchange.address, "20");
    }

    const inputTokenBalance = await inputTokenInstance.balanceOf(this.testDeFiAdapterForUniswapV2Exchange.address);

    expect(inputTokenBalance, inputTokenSymbol).gte(
      parseUnits("20", await inputTokenInstance.decimals()),
      inputTokenSymbol,
    );

    // balance of inputtoken in testdefi adapter for uniswapv2 exchange adapter
    const balanceOfInputTokenInTestDefiAdapterForUniswapV2ExchangeAdapter = await inputTokenInstance.balanceOf(
      this.testDeFiAdapterForUniswapV2Exchange.address,
    );

    // 1. calculate amount in lpToken
    const actualAmountInLpToken = await adapterInstance.calculateAmountInLPToken(
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
      balanceOfInputTokenInTestDefiAdapterForUniswapV2ExchangeAdapter,
    );

    const calculatedAmountInLpToken = await getCalculatedAmountInLpToken(
      this.optyFiOracle,
      inputTokenInstance,
      outputTokenInstance,
      balanceOfInputTokenInTestDefiAdapterForUniswapV2ExchangeAdapter,
    );

    expect(actualAmountInLpToken).to.eq(calculatedAmountInLpToken);
  });
}

async function getCalculatedAmountInLpToken(
  optyFiOracleInstance: OptyFiOracle,
  inputTokenInstance: ERC20,
  outputTokenInstance: ERC20,
  inputTokenAmount: BigNumber,
): Promise<BigNumber> {
  const _price = await optyFiOracleInstance.getTokenPrice(inputTokenInstance.address, outputTokenInstance.address);
  const _decimalsA = await inputTokenInstance.decimals();
  const _decimalsB = await outputTokenInstance.decimals();

  return inputTokenAmount
    .mul(_price)
    .mul(parseUnits("1", _decimalsB))
    .div(parseUnits("1", BigNumber.from(_decimalsA).add(18)));
}
