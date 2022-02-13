import { BigNumber } from "ethers";

export function expandTo18Decimlas(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(BigNumber.from(18)));
}
