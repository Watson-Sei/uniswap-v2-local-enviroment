import { assert } from "console";
import { ethers } from "hardhat";
import ERC20 from "../artifacts/contracts/ERC20.sol/WERC20.json";
// import WETH9 from "@uniswap/v2-periphery/build/WETH9.json";
import WETH9 from "../artifacts/contracts/WETH.sol/WETH.json";
import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2Router02 from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expandTo18Decimlas } from "./shared/utilities";
import { BigNumber, Contract } from "ethers";

describe("UniswapV2 Test", () => {
  let owner: SignerWithAddress;
  let guest: SignerWithAddress;
  let guest1: SignerWithAddress;

  let USDC: Contract;
  let WETH: Contract;
  let factoryV2: Contract;
  let router: Contract;
  let pair: Contract;

  beforeEach(async () => {
    [owner, guest, guest1] = await ethers.getSigners();

    // deploy tokens
    // USDC
    const USDC9 = await ethers.getContractFactory(ERC20.abi, ERC20.bytecode);
    USDC = await USDC9.connect(guest).deploy(10000, "USD Coin", "USDC");
    assert(await USDC.deployed(), "contract was not deployed");
    // WETH
    const WrappedETH = await ethers.getContractFactory(
      WETH9.abi,
      WETH9.bytecode
    );
    WETH = await WrappedETH.connect(guest).deploy(10000);
    assert(await WETH.deployed(), "contract was not deployed");

    // deploy Factory V2
    const FactoryV2 = await ethers.getContractFactory(
      UniswapV2Factory.abi,
      UniswapV2Factory.bytecode
    );
    factoryV2 = await FactoryV2.deploy(owner.address);
    assert(await factoryV2.deployed(), "contract was not deployed");

    // deploy Router02
    const Router02 = await ethers.getContractFactory(
      UniswapV2Router02.abi,
      UniswapV2Router02.bytecode
    );
    router = await Router02.deploy(factoryV2.address, WETH.address);
    assert(await router.deployed(), "contract was not deployed");

    // initialize V2
    // send USDC for guest1
    await USDC.connect(guest).transfer(guest1.address, expandTo18Decimlas(10), {
      from: guest.address,
    });
  });

  it("USDC -> WETH", async () => {
    // guest1 balance USDC and WETH
    console.log(
      "USDC Balance guest1",
      (await USDC.balanceOf(guest1.address)).toString() / 10 ** 18
    );
    console.log(
      "WETH Balance guest1",
      (await WETH.balanceOf(guest1.address)).toString() / 10 ** 18
    );
    // approve token for guest1
    await USDC.approve(router.address, ethers.constants.MaxUint256);
    await WETH.approve(router.address, ethers.constants.MaxUint256);
    // addLiquidity USDC and WETH pair
    await router
      .connect(guest)
      .addLiquidity(
        USDC.address,
        WETH.address,
        expandTo18Decimlas(100),
        expandTo18Decimlas(100),
        0,
        0,
        guest.address,
        ethers.constants.MaxUint256
      );
    // create USDC and WETH pair Contract
    const pairAddress = await factoryV2.getPair(USDC.address, WETH.address);
    pair = new Contract(
      pairAddress,
      JSON.stringify(IUniswapV2Pair.abi),
      ethers.provider
    );
    console.log("USDC<>WETH pair pool Balance: ", await pair.getReserves());
    await USDC.connect(guest1).approve(
      router.address,
      ethers.constants.MaxUint256
    );
    await router
      .connect(guest1)
      .swapExactTokensForTokensSupportingFeeOnTransferTokens(
        expandTo18Decimlas(10),
        0,
        [USDC.address, WETH.address],
        guest1.address,
        ethers.constants.MaxUint256
      );
    console.log("USDC<>WETH pair pool Balance: ", await pair.getReserves());
    console.log(
      "USDC Balance guest1",
      (await USDC.balanceOf(guest1.address)).toString() / 10 ** 18
    );
    console.log(
      "WETH Balance guest1",
      (await WETH.balanceOf(guest1.address)).toString() / 10 ** 18
    );
  });
});
