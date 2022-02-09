/* eslint-disable import/no-duplicates */
/* eslint-disable node/no-missing-import */
import chai, { expect } from "chai";
import { createFixtureLoader, MockProvider, solidity } from "ethereum-waffle";
import { BigNumber, constants, Contract } from "ethers";
import { v2Fixture } from "./shared/fixtures";

chai.use(solidity);

describe("UniswapV2 Test", () => {
  const provider = new MockProvider();
  const [wallet] = provider.getWallets();
  const loadFixture = createFixtureLoader([wallet], provider);

  let token0: Contract;
  let token1: Contract;
  let router: Contract;
  beforeEach(async function () {
    const fixture = await loadFixture(v2Fixture);
    token0 = fixture.token0;
    token1 = fixture.token1;
    router = fixture.router02;
  });

  // ある資産の金額と準備金があれば、同等の価値を持つもう一方の資産の金額を返す。
  it("quote", async () => {
    expect(
      await router.quote(
        BigNumber.from(1),
        BigNumber.from(100),
        BigNumber.from(200)
      )
    ).to.eq(BigNumber.from(2));
    expect(
      await router.quote(
        BigNumber.from(2),
        BigNumber.from(200),
        BigNumber.from(100)
      )
    ).to.eq(BigNumber.from(1));
    await expect(
      router.quote(BigNumber.from(0), BigNumber.from(100), BigNumber.from(200))
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_AMOUNT");
    await expect(
      router.quote(BigNumber.from(1), BigNumber.from(0), BigNumber.from(200))
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_LIQUIDITY");
    await expect(
      router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_LIQUIDITY");
  });

  // 入力資産額を指定すると、準備金を指定した他の資産（手数料を考慮）の最大出力額を返します。
  it("getAmountOut", async () => {
    expect(
      await router.getAmountOut(
        BigNumber.from(2),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.eq(BigNumber.from(1));
    await expect(
      router.getAmountOut(
        BigNumber.from(0),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT");
    await expect(
      router.getAmountOut(
        BigNumber.from(2),
        BigNumber.from(0),
        BigNumber.from(100)
      )
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_LIQUIDITY");
    await expect(
      router.getAmountOut(
        BigNumber.from(2),
        BigNumber.from(100),
        BigNumber.from(0)
      )
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_LIQUIDITY");
  });

  // 指定された準備金を指定された出力資産額（手数料を考慮）を購入するために必要な最小入力資産額を返します。
  it("getAmountIn", async () => {
    expect(
      await router.getAmountIn(
        BigNumber.from(1),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.eq(BigNumber.from(2));
    await expect(
      router.getAmountIn(
        BigNumber.from(0),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT");
    await expect(
      router.getAmountIn(
        BigNumber.from(1),
        BigNumber.from(0),
        BigNumber.from(100)
      )
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_LIQUIDITY");
    await expect(
      router.getAmountIn(
        BigNumber.from(1),
        BigNumber.from(100),
        BigNumber.from(0)
      )
    ).to.be.revertedWith("UniswapV2Library: INSUFFICIENT_LIQUIDITY");
  });

  // 入力された資産額とトークン・アドレスの配列が与えられた場合、パスに含まれるトークン・アドレスの各ペアに対して順番にgetReservesを呼び出し、それらを使用してgetAmountOutを呼び出すことで、それ以降のすべての最大出力トークン額を計算します。
  it("getAmountsOut", async () => {
    await token0.connect(wallet).approve(router.address, constants.MaxUint256);
    await token1.connect(wallet).approve(router.address, constants.MaxUint256);
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000).mul(BigNumber.from(10).pow(BigNumber.from(18))),
      BigNumber.from(10000).mul(BigNumber.from(10).pow(BigNumber.from(18))),
      0,
      0,
      wallet.address,
      constants.MaxUint256
    );
    await expect(
      router.getAmountsOut(BigNumber.from(2), [wallet.address])
    ).to.be.revertedWith("UniswapV2Library: INVALID_PATH");
    const path = [token0.address, token1.address];
    expect(await router.getAmountsOut(BigNumber.from(2), path)).to.deep.eq([
      BigNumber.from(2),
      BigNumber.from(1),
    ]);
  });

  // 出力資産額とトークン・アドレスの配列が与えられると、パス内の各トークン・アドレスのペアに対して順番にgetReservesを呼び出し、それらを使用してgetAmountInを呼び出すことにより、先行するすべての最小入力トークン額を計算します。
  it("getAmountsIn", async () => {
    await token0.approve(router.address, constants.MaxUint256);
    await token1.approve(router.address, constants.MaxUint256);
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000).mul(BigNumber.from(10).pow(BigNumber.from(18))),
      BigNumber.from(10000).mul(BigNumber.from(10).pow(BigNumber.from(18))),
      0,
      0,
      wallet.address,
      constants.MaxUint256
    );
    await expect(
      router.getAmountsIn(BigNumber.from(1), [token0.address])
    ).to.be.revertedWith("UniswapV2Library: INVALID_PATH");
    const path = [token0.address, token1.address];
    expect(await router.getAmountsIn(BigNumber.from(1), path)).to.deep.eq([
      BigNumber.from(2),
      BigNumber.from(1),
    ]);
  });
});
