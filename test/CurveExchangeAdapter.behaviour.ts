import { ethers, network } from "hardhat";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import WETHAbi from "@optyfi/defi-legos/interfaces/misc/abi/WETH.json";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import { PoolItem } from "./types";
import { setTokenBalanceInStorage } from "./utils";
import {
  ERC20,
  ERC20__factory,
  ICurveMetaRegistry,
  ICurveRegistryExchange,
  ICurveSwap,
  ICurveSwap__factory,
} from "../typechain";
import { expect } from "chai";
import { BigNumber } from "ethers";

const USDT_WHALE = "0x5041ed759Dd4aFc3a72b8192C143F72f4724081A";
const sLINK_WHALE = "0x45899a8104CDa54deaBaDDA505f0bBA68223F631";
const SETH_WHALE = "0xAB8ABcA00E36b396Aa3b9D9A5796d0e18AF583Ae";
const DAI_WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC";

export function shouldBehaveLikeCurveExchangeAdapter(
  poolItem: PoolItem,
  poolName: string,
  inputToken: string,
  outputToken: string,
): void {
  it("", async function () {
    const inputTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, inputToken);
    const outputTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, outputToken);
    const inputTokenSymbol = await inputTokenInstance.symbol();
    const outputTokenSymbol = await outputTokenInstance.symbol();
    this._runnable.title = `should swap ${inputTokenSymbol} and reverse swap ${outputTokenSymbol} in ${poolName} pool of Curve`;
    let tx = await this.testDeFiAdapterForCurveExchange.revokeAllowances(
      [
        inputTokenInstance.address,
        outputTokenInstance.address,
        inputTokenInstance.address,
        outputTokenInstance.address,
        inputTokenInstance.address,
        outputTokenInstance.address,
      ],
      [
        CurveExports.CurveRegistryExchange.address,
        CurveExports.CurveRegistryExchange.address,
        poolItem.pool,
        poolItem.pool,
        await this.curveExchangeAdapter.curveExchangeETHGatewayContract(),
        await this.curveExchangeAdapter.curveExchangeETHGatewayContract(),
      ],
    );
    await tx.wait(1);

    tx = await this.testDeFiAdapterForCurveExchange.giveAllowances(
      [
        inputTokenInstance.address,
        outputTokenInstance.address,
        inputTokenInstance.address,
        outputTokenInstance.address,
        inputTokenInstance.address,
        outputTokenInstance.address,
      ],
      [
        CurveExports.CurveRegistryExchange.address,
        CurveExports.CurveRegistryExchange.address,
        poolItem.pool,
        poolItem.pool,
        await this.curveExchangeAdapter.curveExchangeETHGatewayContract(),
        await this.curveExchangeAdapter.curveExchangeETHGatewayContract(),
      ],
    );
    await tx.wait(1);

    if (getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)) {
      const wethInstance = await ethers.getContractAt(WETHAbi, inputTokenInstance.address);
      tx = await wethInstance.connect(this.signers.deployer).deposit({ value: parseEther("20") });
      await tx.wait(1);
      tx = await wethInstance
        .connect(this.signers.deployer)
        .transfer(this.testDeFiAdapterForCurveExchange.address, parseEther("20"));
    } else if (getAddress(inputTokenInstance.address) === getAddress("0xbBC455cb4F1B9e4bFC4B73970d360c8f032EfEE6")) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [sLINK_WHALE],
      });
      const whaleSigner = await ethers.getSigner(sLINK_WHALE);
      tx = await inputTokenInstance
        .connect(whaleSigner)
        .transfer(this.testDeFiAdapterForCurveExchange.address, parseUnits("20", await inputTokenInstance.decimals()));
      await tx.wait(1);
    } else if (getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.PLAIN_TOKENS.USDT)) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [USDT_WHALE],
      });
      const whaleSigner = await ethers.getSigner(USDT_WHALE);
      tx = await inputTokenInstance
        .connect(whaleSigner)
        .transfer(this.testDeFiAdapterForCurveExchange.address, parseUnits("20", await inputTokenInstance.decimals()));
      await tx.wait(1);
    } else if (getAddress(inputTokenInstance.address) == getAddress("0x5e74C9036fb86BD7eCdcb084a0673EFc32eA31cb")) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [SETH_WHALE],
      });
      const whaleSigner = await ethers.getSigner(SETH_WHALE);
      tx = await inputTokenInstance
        .connect(whaleSigner)
        .transfer(this.testDeFiAdapterForCurveExchange.address, parseUnits("20", await inputTokenInstance.decimals()));
      await tx.wait(1);
    } else if (getAddress(inputTokenInstance.address) == getAddress(EthereumTokens.PLAIN_TOKENS.DAI)) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [DAI_WHALE],
      });
      const whaleSigner = await ethers.getSigner(DAI_WHALE);
      tx = await inputTokenInstance
        .connect(whaleSigner)
        .transfer(this.testDeFiAdapterForCurveExchange.address, parseUnits("20", await inputTokenInstance.decimals()));
      await tx.wait(1);
    } else {
      await setTokenBalanceInStorage(inputTokenInstance, this.testDeFiAdapterForCurveExchange.address, "20");
    }

    // balance of inputtoken in testdefi adapter for curve exchange adapter
    const balanceOfInputTokenInTestDefiAdapterForCurveExchangeAdapter = await inputTokenInstance.balanceOf(
      this.testDeFiAdapterForCurveExchange.address,
    );

    // 1. calculate amount in lpToken
    const actualAmountInLpToken = await this.curveExchangeAdapter.calculateAmountInLPToken(
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
      balanceOfInputTokenInTestDefiAdapterForCurveExchangeAdapter,
    );

    const calculatedAmountInLpToken = await getCalculatedAmountInLpToken(
      this.curveMetaRegistry,
      this.curveRegistryExchange,
      poolItem,
      inputTokenInstance,
      balanceOfInputTokenInTestDefiAdapterForCurveExchangeAdapter,
      outputTokenInstance,
    );

    expect(actualAmountInLpToken).to.eq(calculatedAmountInLpToken);

    // 2. deposit all underlying tokens

    tx = await this.testDeFiAdapterForCurveExchange.testGetDepositAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);

    // 3. assert whether lptoken balance is as expected or not after deposit
    const actuallpTokenBalance = await outputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address);
    expect(actuallpTokenBalance).to.gte(calculatedAmountInLpToken.mul(9900).div(10000));

    const expectedlpTokenBalance = await this.curveExchangeAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapterForCurveExchange.address,
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
    );
    expect(expectedlpTokenBalance).to.eq(actuallpTokenBalance);

    // 4. all amount in token
    const calculatedAllAmountInToken = await getCalculatedAmountInToken(
      this.curveMetaRegistry,
      this.curveRegistryExchange,
      poolItem,
      inputTokenInstance,
      expectedlpTokenBalance,
      outputTokenInstance,
    );

    const actualAllAmountInToken = await this.curveExchangeAdapter.getAllAmountInToken(
      this.testDeFiAdapterForCurveExchange.address,
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
    );

    expect(actualAllAmountInToken).to.eq(calculatedAllAmountInToken);

    // 5. some amount in token

    const calculatedSomeAmountInToken = await getCalculatedAmountInToken(
      this.curveMetaRegistry,
      this.curveRegistryExchange,
      poolItem,
      inputTokenInstance,
      expectedlpTokenBalance.div(2),
      outputTokenInstance,
    );
    const actualSomeAmountInToken = await this.curveExchangeAdapter.getSomeAmountInToken(
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
      expectedlpTokenBalance.div(2),
    );

    expect(actualSomeAmountInToken).to.eq(calculatedSomeAmountInToken);

    // 6. withdraw all underlying tokens

    tx = await this.testDeFiAdapterForCurveExchange.testGetWithdrawAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);

    // 7. assert whether input token balance is as expected or not after withdraw

    const actualInputTokenBalance = await inputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address);
    expect(actualInputTokenBalance).to.gte(actualAllAmountInToken.mul(9900).div(10000));

    // some

    const _inputTokenTestAmount = actualInputTokenBalance.div(2);

    expect(_inputTokenTestAmount).gt(0);

    // 8. deposit some

    const _calculatedAmountInLpToken = await getCalculatedAmountInLpToken(
      this.curveMetaRegistry,
      this.curveRegistryExchange,
      poolItem,
      inputTokenInstance,
      _inputTokenTestAmount,
      outputTokenInstance,
    );

    tx = await this.testDeFiAdapterForCurveExchange.testGetDepositSomeCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      _inputTokenTestAmount,
      outputTokenInstance.address,
    );
    await tx.wait(1);

    // 9. assert whether lptoken balance is as expected or not after deposit
    const _actuallpTokenBalance = await outputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address);
    expect(_actuallpTokenBalance).to.gte(_calculatedAmountInLpToken.mul(9900).div(10000));

    const _expectedlpTokenBalance = await this.curveExchangeAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapterForCurveExchange.address,
      inputTokenInstance.address,
      poolItem.pool,
      outputTokenInstance.address,
    );
    expect(_expectedlpTokenBalance).to.eq(_actuallpTokenBalance);

    // 10. withdraw some

    tx = await this.testDeFiAdapterForCurveExchange.testGetWithdrawSomeCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      _actuallpTokenBalance,
      outputTokenInstance.address,
    );
    await tx.wait(1);
    // 11. assert whether input token balance is as expected or not after withdraw

    const _actualSomeAmountInToken = await getCalculatedAmountInToken(
      this.curveMetaRegistry,
      this.curveRegistryExchange,
      poolItem,
      inputTokenInstance,
      _actuallpTokenBalance,
      outputTokenInstance,
    );

    const _actualInputTokenBalance = await inputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address);
    expect(_actualInputTokenBalance.sub(_inputTokenTestAmount)).to.gte(_actualSomeAmountInToken.mul(9900).div(10000));

    // 12. can stake should return false
    expect(await this.curveExchangeAdapter.canStake(poolItem.pool)).to.be.false;
  });
}

export function shouldInitializeVariablesLikeCurveExchangeAdapter(): void {
  it("assert constructor logic", async function () {
    expect(await this.curveExchangeAdapter.registryContract()).to.eq(this.mockRegistry.address);
    expect(await this.curveExchangeAdapter.CurveRegistryExchange()).to.eq(CurveExports.CurveRegistryExchange.address);
    expect(await this.curveExchangeAdapter.META_REGISTRY()).to.eq(CurveExports.CurveMetaRegistry.address);
    expect(await this.curveExchangeAdapter.WrappedNetworkToken()).to.eq(EthereumTokens.WRAPPED_TOKENS.WETH);
    expect(await this.curveExchangeAdapter.ETH()).to.eq(EthereumTokens.PLAIN_TOKENS.ETH);
    expect(await this.curveExchangeAdapter.curveExchangeETHGatewayContract()).to.be.properAddress;
  });
}

async function getCalculatedAmountInLpToken(
  curveMetaRegistryInstance: ICurveMetaRegistry,
  curveRegistryExchangeInstance: ICurveRegistryExchange,
  poolItem: PoolItem,
  inputTokenInstance: ERC20,
  inputTokenAmount: BigNumber,
  outputTokenInstance: ERC20,
): Promise<BigNumber> {
  if (
    getAddress(await curveMetaRegistryInstance["get_lp_token(address)"](poolItem.pool)) ==
      getAddress(inputTokenInstance.address) &&
    poolItem &&
    poolItem.tokenIndexes
  ) {
    const stableSwapInstance = <ICurveSwap>await ethers.getContractAt(ICurveSwap__factory.abi, poolItem.pool);
    return await stableSwapInstance["calc_withdraw_one_coin(uint256,int128)"](
      inputTokenAmount,
      poolItem.tokenIndexes[0],
    );
  } else {
    return await curveRegistryExchangeInstance.get_exchange_amount(
      poolItem.pool,
      getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)
        ? EthereumTokens.PLAIN_TOKENS.ETH
        : inputTokenInstance.address,
      getAddress(outputTokenInstance.address) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)
        ? EthereumTokens.PLAIN_TOKENS.ETH
        : outputTokenInstance.address,
      inputTokenAmount,
    );
  }
}

async function getCalculatedAmountInToken(
  curveMetaRegistryInstance: ICurveMetaRegistry,
  curveRegistryExchangeInstance: ICurveRegistryExchange,
  poolItem: PoolItem,
  inputTokenInstance: ERC20,
  outputTokenAmount: BigNumber,
  outputTokenInstance: ERC20,
): Promise<BigNumber> {
  if (
    getAddress(await curveMetaRegistryInstance["get_lp_token(address)"](poolItem.pool)) ==
      getAddress(inputTokenInstance.address) &&
    poolItem &&
    poolItem.tokenIndexes
  ) {
    const stableSwapInstance = <ICurveSwap>await ethers.getContractAt(ICurveSwap__factory.abi, poolItem.pool);
    const _numTokens = await curveMetaRegistryInstance["get_n_underlying_coins(address)"](poolItem.pool);
    if (_numTokens.eq(3) && poolItem.tokenIndexes[0] == "0") {
      return await stableSwapInstance["calc_token_amount(uint256[3],bool)"]([outputTokenAmount, 0, 0], true);
    } else if (_numTokens.eq(3) && poolItem.tokenIndexes[0] == "1") {
      return await stableSwapInstance["calc_token_amount(uint256[3],bool)"]([0, outputTokenAmount, 0], true);
    } else if (_numTokens.eq(3) && poolItem.tokenIndexes[0] == "2") {
      return await stableSwapInstance["calc_token_amount(uint256[3],bool)"]([0, 0, outputTokenAmount], true);
    } else if (_numTokens.eq(2) && poolItem.tokenIndexes[0] == "0") {
      return await stableSwapInstance["calc_token_amount(uint256[2],bool)"]([outputTokenAmount, 0], true);
    } else if (_numTokens.eq(2) && poolItem.tokenIndexes[0] == "1") {
      return await stableSwapInstance["calc_token_amount(uint256[2],bool)"]([0, outputTokenAmount], true);
    } else if (_numTokens.eq(4) && poolItem.tokenIndexes[0] == "0") {
      return await stableSwapInstance["calc_token_amount(uint256[4],bool)"]([outputTokenAmount, 0, 0, 0], true);
    } else if (_numTokens.eq(4) && poolItem.tokenIndexes[0] == "1") {
      return await stableSwapInstance["calc_token_amount(uint256[4],bool)"]([0, outputTokenAmount, 0, 0], true);
    } else if (_numTokens.eq(4) && poolItem.tokenIndexes[0] == "2") {
      return await stableSwapInstance["calc_token_amount(uint256[4],bool)"]([0, 0, outputTokenAmount, 0], true);
    } else if (_numTokens.eq(4) && poolItem.tokenIndexes[0] == "3") {
      return await stableSwapInstance["calc_token_amount(uint256[4],bool)"]([0, 0, 0, outputTokenAmount], true);
    }
  } else {
    return await curveRegistryExchangeInstance.get_exchange_amount(
      poolItem.pool,
      getAddress(outputTokenInstance.address) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)
        ? EthereumTokens.PLAIN_TOKENS.ETH
        : outputTokenInstance.address,
      getAddress(inputTokenInstance.address) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)
        ? EthereumTokens.PLAIN_TOKENS.ETH
        : inputTokenInstance.address,
      outputTokenAmount,
    );
  }
  return BigNumber.from("0");
}
