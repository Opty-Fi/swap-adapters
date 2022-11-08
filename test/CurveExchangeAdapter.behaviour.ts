import { ethers } from "hardhat";
import { expect } from "chai";
import { PoolItem } from "./types";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import { setTokenBalanceInStorage } from "./utils";
import { ERC20, ERC20__factory } from "../typechain";

export function shouldBehaveLikeCurveExchangeAdapter(poolItem: PoolItem, poolName: string): void {
  it("", async function () {
    const inputTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, poolItem.lpToken);
    const outputTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, poolItem.tokens[0]);
    const inputTokenSymbol = await inputTokenInstance.symbol();
    const outputTokenSymbol = await outputTokenInstance.symbol();
    this._runnable.title = `should swap ${inputTokenSymbol} and reverse swap ${outputTokenSymbol} in ${poolName} pool of Curve`;
    let tx = await this.testDeFiAdapterForCurveExchange.revokeAllowances(
      [poolItem.lpToken, poolItem.tokens[0]],
      [CurveExports.CurveRegistryExchange.address, CurveExports.CurveRegistryExchange.address],
    );
    await tx.wait(1);

    tx = await this.testDeFiAdapterForCurveExchange.giveAllowances(
      [poolItem.lpToken, poolItem.tokens[0]],
      [CurveExports.CurveRegistryExchange.address, CurveExports.CurveRegistryExchange.address],
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

    // 1. deposit all underlying tokens
    tx = await this.testDeFiAdapterForCurveExchange.testGetDepositAllCodes(
      inputTokenInstance.address,
      poolItem.pool,
      this.curveExchangeAdapter.address,
      poolItem.tokens[0],
    );
    await tx.wait(1);
  });
}
