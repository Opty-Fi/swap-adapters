import { ethers } from "hardhat";
import { expect } from "chai";
import { PoolItem } from "./types";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import { setTokenBalanceInStorage } from "./utils";
import { ERC20, ERC20__factory } from "../typechain";

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

    expect(
      await inputTokenInstance.allowance(
        this.testDeFiAdapterForCurveExchange.address,
        CurveExports.CurveRegistryExchange.address,
      ),
    ).to.eq(ethers.constants.MaxUint256);

    expect(
      await outputTokenInstance.allowance(
        this.testDeFiAdapterForCurveExchange.address,
        CurveExports.CurveRegistryExchange.address,
      ),
    ).to.eq(ethers.constants.MaxUint256);

    await setTokenBalanceInStorage(inputTokenInstance, this.testDeFiAdapterForCurveExchange.address, "20");

    console.log(
      `1. ${outputTokenSymbol} `,
      (await outputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    );
    console.log(
      `1. ${inputTokenSymbol} `,
      (await inputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    );
    // 1. deposit all underlying tokens
    tx = await this.testDeFiAdapterForCurveExchange.testGetDepositAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);
    console.log(
      `2. ${outputTokenSymbol} `,
      (await outputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    );
    console.log(
      `2. ${inputTokenSymbol} `,
      (await inputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    );

    // 2. withdraw all underlying tokens
    tx = await this.testDeFiAdapterForCurveExchange.testGetWithdrawAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      outputTokenInstance.address,
    );
    await tx.wait(1);
    console.log(
      `3. ${outputTokenSymbol} `,
      (await outputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    );
    console.log(
      `3. ${inputTokenSymbol} `,
      (await inputTokenInstance.balanceOf(this.testDeFiAdapterForCurveExchange.address)).toString(),
    );
  });
}
