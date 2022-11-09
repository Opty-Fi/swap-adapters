import { ethers, network } from "hardhat";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import WETHAbi from "@optyfi/defi-legos/interfaces/misc/abi/WETH.json";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import { PoolItem } from "./types";
import { setTokenBalanceInStorage } from "./utils";
import { ERC20, ERC20__factory } from "../typechain";

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
    // 1. deposit all underlying tokens
    // console.log(
    //   `Expected ${outputTokenSymbol}`,
    //   (
    //     await this.curveExchangeAdapter.calculateAmountInLPToken(
    //       inputTokenInstance.address,
    //       poolItem.pool,
    //       outputTokenInstance.address,
    //       await inputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address),
    //     )
    //   ).toString(),
    // );
    tx = await this.testDeFiAdapterForCurveExchange.testGetDepositAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);
    console.log(
      `Actual ${outputTokenSymbol} `,
      (await outputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    );

    // 2. withdraw all underlying tokens
    // console.log(
    //   `Expected ${inputTokenSymbol}`,
    //   (
    //     await this.curveExchangeAdapter.getSomeAmountInToken(
    //       inputTokenInstance.address,
    //       poolItem.pool,
    //       outputTokenInstance.address,
    //       await outputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address),
    //     )
    //   ).toString(),
    // );
    tx = await this.testDeFiAdapterForCurveExchange.testGetWithdrawAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);
    // console.log(
    //   `Actual ${inputTokenSymbol} `,
    //   (await inputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    // );
  });
}
