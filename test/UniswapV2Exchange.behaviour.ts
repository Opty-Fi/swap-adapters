import { expect } from "chai";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import PolygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import WETHAbi from "@optyfi/defi-legos/interfaces/misc/abi/WETH.json";
import EthereumUniswapV2 from "@optyfi/defi-legos/ethereum/uniswapV2/index";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import PolygonSushiswapExports from "@optyfi/defi-legos/polygon/sushiswap/index";
import PolygonQuickswapExports from "@optyfi/defi-legos/polygon/quickswap/index";
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
      adapterInstances[process.env.FORK as string as keyof typeof adapterInstances][adapter];

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

    tx = await adapterInstance.connect(this.signers.riskOperator).setLiquidityPoolToWantTokenToSlippage([
      {
        liquidityPool: poolItem.pool,
        wantToken: outputTokenInstance.address,
        slippage: "400",
      },
      {
        liquidityPool: poolItem.pool,
        wantToken: inputTokenInstance.address,
        slippage: "400",
      },
    ]);
    await tx.wait(1);

    let testAmount;

    if (
      getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.BTC_TOKENS.WBTC) ||
      getAddress(inputTokenInstance.address) === getAddress(PolygonTokens.WBTC)
    ) {
      testAmount = "1";
    } else {
      testAmount = "20";
    }

    if (
      process.env.FORK === eEthereumNetwork.mainnet &&
      getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)
    ) {
      const wethInstance = await ethers.getContractAt(WETHAbi, inputTokenInstance.address);
      tx = await wethInstance.connect(this.signers.deployer).deposit({ value: parseEther(testAmount) });
      await tx.wait(1);
      tx = await wethInstance
        .connect(this.signers.deployer)
        .transfer(this.testDeFiAdapterForUniswapV2Exchange.address, parseEther(testAmount));
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
          parseUnits(testAmount, await inputTokenInstance.decimals()),
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
          parseUnits(testAmount, await inputTokenInstance.decimals()),
        );
      await tx.wait(1);
    } else if (
      process.env.FORK === ePolygonNetwork.polygon &&
      getAddress(inputTokenInstance.address) === getAddress(PolygonTokens.WMATIC)
    ) {
      const wethInstance = await ethers.getContractAt(WETHAbi, inputTokenInstance.address);
      tx = await wethInstance.connect(this.signers.deployer).deposit({ value: parseEther(testAmount) });
      await tx.wait(1);
      tx = await wethInstance
        .connect(this.signers.deployer)
        .transfer(this.testDeFiAdapterForUniswapV2Exchange.address, parseEther(testAmount));
    } else {
      await setTokenBalanceInStorage(inputTokenInstance, this.testDeFiAdapterForUniswapV2Exchange.address, testAmount);
    }

    const inputTokenBalance = await inputTokenInstance.balanceOf(this.testDeFiAdapterForUniswapV2Exchange.address);

    expect(inputTokenBalance, inputTokenSymbol).gte(
      parseUnits(testAmount, await inputTokenInstance.decimals()),
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

    // 2. deposit all underlying tokens

    tx = await this.testDeFiAdapterForUniswapV2Exchange.testGetDepositAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      adapterInstance.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);

    // 3. assert whether lptoken balance is as expected or not after deposit
    const actuallpTokenBalance = await outputTokenInstance.balanceOf(this.testDeFiAdapterForUniswapV2Exchange.address);
    expect(actuallpTokenBalance).to.gte(calculatedAmountInLpToken.mul(9700).div(10000));

    const expectedlpTokenBalance = await adapterInstance.getLiquidityPoolTokenBalance(
      this.testDeFiAdapterForUniswapV2Exchange.address,
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
    );
    expect(expectedlpTokenBalance).to.eq(actuallpTokenBalance);

    // 4. all amount in token
    const calculatedAllAmountInToken = await getCalculatedAmountInToken(
      this.optyFiOracle,
      inputTokenInstance,
      outputTokenInstance,
      expectedlpTokenBalance,
    );

    const actualAllAmountInToken = await adapterInstance.getAllAmountInToken(
      this.testDeFiAdapterForUniswapV2Exchange.address,
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
    );

    expect(actualAllAmountInToken).to.eq(calculatedAllAmountInToken);

    // 5. some amount in token
    const calculatedSomeAmountInToken = await getCalculatedAmountInToken(
      this.optyFiOracle,
      inputTokenInstance,
      outputTokenInstance,
      expectedlpTokenBalance.div(2),
    );
    const actualSomeAmountInToken = await adapterInstance.getSomeAmountInToken(
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
      expectedlpTokenBalance.div(2),
    );

    expect(actualSomeAmountInToken).to.eq(calculatedSomeAmountInToken);

    // 6. withdraw all underlying tokens

    tx = await this.testDeFiAdapterForUniswapV2Exchange.testGetWithdrawAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      adapterInstance.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);

    // 7. assert whether input token balance is as expected or not after withdraw

    const actualInputTokenBalance = await inputTokenInstance.balanceOf(
      this.testDeFiAdapterForUniswapV2Exchange.address,
    );
    expect(actualInputTokenBalance).to.gte(actualAllAmountInToken.mul(9700).div(10000));

    // some

    const _inputTokenTestAmount = actualInputTokenBalance.div(2);

    expect(_inputTokenTestAmount).gt(0);

    // 8. deposit some

    const _calculatedAmountInLpToken = await getCalculatedAmountInLpToken(
      this.optyFiOracle,
      inputTokenInstance,
      outputTokenInstance,
      _inputTokenTestAmount,
    );

    tx = await this.testDeFiAdapterForUniswapV2Exchange.testGetDepositSomeCodes(
      inputTokenInstance.address,
      poolItem.pool,
      adapterInstance.address,
      _inputTokenTestAmount,
      outputTokenInstance.address,
    );
    await tx.wait(1);

    // 9. assert whether lptoken balance is as expected or not after deposit
    const _actuallpTokenBalance = await outputTokenInstance.balanceOf(this.testDeFiAdapterForUniswapV2Exchange.address);
    expect(_actuallpTokenBalance).to.gte(_calculatedAmountInLpToken.mul(9700).div(10000));

    const _expectedlpTokenBalance = await adapterInstance.getLiquidityPoolTokenBalance(
      this.testDeFiAdapterForUniswapV2Exchange.address,
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
    );
    expect(_expectedlpTokenBalance).to.eq(_actuallpTokenBalance);

    // 10. withdraw some

    tx = await this.testDeFiAdapterForUniswapV2Exchange.testGetWithdrawSomeCodes(
      inputTokenInstance.address,
      poolItem.pool,
      adapterInstance.address,
      _actuallpTokenBalance,
      outputTokenInstance.address,
    );
    await tx.wait(1);
    // 11. assert whether input token balance is as expected or not after withdraw

    const _actualSomeAmountInToken = await getCalculatedAmountInToken(
      this.optyFiOracle,
      inputTokenInstance,
      outputTokenInstance,
      _actuallpTokenBalance,
    );

    const _actualInputTokenBalance = await inputTokenInstance.balanceOf(
      this.testDeFiAdapterForUniswapV2Exchange.address,
    );
    expect(_actualInputTokenBalance.sub(_inputTokenTestAmount)).to.gte(_actualSomeAmountInToken.mul(9800).div(10000));

    // 12. can stake should return false
    expect(await adapterInstance.canStake(poolItem.pool)).to.be.false;
  });
}

export function shouldInitializeVariablesLikeUniswapV2ExchangeAdapter(adapter: string): void {
  it("assert constructor logic", async function () {
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
      adapterInstances[process.env.FORK as string as keyof typeof adapterInstances][adapter];
    expect(await adapterInstance.registryContract()).to.eq(this.mockRegistry.address);

    if (process.env.FORK === eEthereumNetwork.mainnet) {
      if (adapter === "uniswapV2") {
        expect(getAddress(await adapterInstance.UniswapV2Router())).to.eq(
          getAddress(EthereumUniswapV2.router02.address),
        );
      } else if (adapter === "sushiswap") {
        expect(getAddress(await adapterInstance.UniswapV2Router())).to.eq(
          getAddress(EthereumSushiswap.SushiswapRouter.address),
        );
      }
    } else if (process.env.FORK === ePolygonNetwork.polygon) {
      if (adapter === "sushiswap") {
        expect(getAddress(await adapterInstance.UniswapV2Router())).to.eq(
          getAddress(PolygonSushiswapExports.SushiswapRouter.address),
        );
      } else if (adapter === "quickswap") {
        expect(getAddress(await adapterInstance.UniswapV2Router())).to.eq(
          getAddress(PolygonQuickswapExports.QuickswapRouter.address),
        );
      }
    }
    expect(getAddress(await adapterInstance.optyFiOracle())).to.eq(getAddress(this.optyFiOracle.address));
  });
}

export function shouldPerformStateChangesLikeUniswapV2ExchangeAdapter(adapter: string): void {
  let adapterInstance: UniswapV2ExchangeAdapter;
  it("setLiquidityPoolToWantTokenToSlippage fail", async function () {
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
    adapterInstance = adapterInstances[process.env.FORK as string as keyof typeof adapterInstances][adapter];
    await expect(
      adapterInstance.connect(this.signers.alice).setLiquidityPoolToWantTokenToSlippage([
        {
          liquidityPool: ethers.constants.AddressZero,
          wantToken: ethers.constants.AddressZero,
          slippage: "1",
        },
      ]),
    ).to.revertedWith("caller is not the riskOperator");
  });
  it("setLiquidityPoolToWantTokenToSlippage success", async function () {
    const tx = await adapterInstance.connect(this.signers.riskOperator).setLiquidityPoolToWantTokenToSlippage([
      {
        liquidityPool: EthereumSushiswap.liquidity.pools["AAVE-WETH"].pool,
        wantToken: EthereumSushiswap.liquidity.pools["AAVE-WETH"].token0,
        slippage: "100",
      },
    ]);
    await tx.wait(1);
    expect(
      await adapterInstance.liquidityPoolToWantTokenToSlippage(
        EthereumSushiswap.liquidity.pools["AAVE-WETH"].pool,
        EthereumSushiswap.liquidity.pools["AAVE-WETH"].token0,
      ),
    ).to.eq("100");
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

async function getCalculatedAmountInToken(
  optyFiOracleInstance: OptyFiOracle,
  inputTokenInstance: ERC20,
  outputTokenInstance: ERC20,
  outputTokenAmount: BigNumber,
): Promise<BigNumber> {
  const _price = await optyFiOracleInstance.getTokenPrice(outputTokenInstance.address, inputTokenInstance.address);
  const _decimalsA = await inputTokenInstance.decimals();
  const _decimalsB = await outputTokenInstance.decimals();

  return outputTokenAmount
    .mul(_price)
    .mul(parseUnits("1", _decimalsA))
    .div(parseUnits("1", BigNumber.from(_decimalsB).add(18)));
}
