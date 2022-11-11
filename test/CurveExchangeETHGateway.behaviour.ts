import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { expect } from "chai";

export function shouldBehaveLikeCurveExchangeETHGatewayContract(): void {
  it("test CurveExchange constructor vars", async function () {
    expect(await this.curveExchangeETHGateway.registryContract()).to.eq(this.mockRegistry.address);
    expect(await this.curveExchangeETHGateway.getWETHAddress()).to.eq(EthereumTokens.WRAPPED_TOKENS.WETH);
    expect(await this.curveExchangeETHGateway.CurveRegistryExchange()).to.eq(
      CurveExports.CurveRegistryExchange.address,
    ),
      expect(await this.curveExchangeETHGateway.ethPools(CurveExports.CurveSwapPool["seth_eth+seth"].pool)).to.be.true;
    expect(await this.curveExchangeETHGateway.ethPools(CurveExports.CurveSwapPool["aethc_eth+aethc"].pool)).to.be.true;
    expect(await this.curveExchangeETHGateway.ethPools(CurveExports.CurveSwapPool["reth_eth+reth"].pool)).to.be.true;
    expect(await this.curveExchangeETHGateway.ethPools(CurveExports.CurveSwapPool["steth_eth+steth"].pool)).to.be.true;
    expect(await this.curveExchangeETHGateway.ethPools(CurveExports.CurveRegistryExchange.address)).to.be.true;
  });

  it("setEthPools failure", async function () {
    await expect(
      this.curveExchangeETHGateway
        .connect(this.signers.alice)
        .setEthPools([CurveExports.CurveSwapPool["3crv_LinkUSD3CRV"].pool]),
    ).to.revertedWith("caller is not the operator");
  });

  it("setEthPools success", async function () {
    const tx = await this.curveExchangeETHGateway
      .connect(this.signers.operator)
      .setEthPools([CurveExports.CurveSwapPool["3crv_LinkUSD3CRV"].pool]);
    await tx.wait(1);
    expect(await this.curveExchangeETHGateway.ethPools(CurveExports.CurveSwapPool["3crv_LinkUSD3CRV"].pool)).to.be.true;
  });

  it("unsetEthPools failure", async function () {
    await expect(
      this.curveExchangeETHGateway
        .connect(this.signers.alice)
        .unsetEthPools([CurveExports.CurveSwapPool["3crv_LinkUSD3CRV"].pool]),
    ).to.revertedWith("caller is not the operator");
  });

  it("unsetEthPools success", async function () {
    const tx = await this.curveExchangeETHGateway
      .connect(this.signers.operator)
      .unsetEthPools([CurveExports.CurveSwapPool["3crv_LinkUSD3CRV"].pool]);
    await tx.wait(1);
    expect(await this.curveExchangeETHGateway.ethPools(CurveExports.CurveSwapPool["3crv_LinkUSD3CRV"].pool)).to.be
      .false;
  });
}
