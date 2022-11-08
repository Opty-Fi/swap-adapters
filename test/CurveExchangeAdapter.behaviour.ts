import { expect } from "chai";
import { PoolItem } from "./types";

export function shouldBehaveLikeCurveExchangeAdapter(poolItem: PoolItem): void {
  it(`Test`, async function () {
    console.log(poolItem);
    expect("1").to.eq("1");
  });
}
