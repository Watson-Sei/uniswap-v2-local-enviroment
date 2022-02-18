/* eslint-disable node/no-missing-import */
import { assert } from "console";
import { ethers } from "hardhat";
import ERC20 from "../artifacts/contracts/ERC20.sol/WERC20.json";
import WETH9 from "../artifacts/contracts/WETH.sol/WETH.json";
import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2Router02 from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expandTo18Decimlas } from "./shared/utilities";
import { Contract } from "ethers";
import ExchangeAgent01 from "../artifacts/contracts/ExchangeAgent.sol/TestUniswap.json";
import { expect } from "chai";
import Back01 from "../artifacts/contracts/Bank.sol/BankWithUniswap.json";

describe("UniswapV2 Test", () => {
  let owner: SignerWithAddress;
  let guest: SignerWithAddress;
  let guest1: SignerWithAddress;

  let USDC: Contract;
  let WETH: Contract;
  let factoryV2: Contract;
  let router: Contract;
  let pair: Contract;
  let exchange01: Contract;
  let bank01: Contract;

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

    // Exchange agent Contract
    const ExchangeAgent = await ethers.getContractFactory(
      ExchangeAgent01.abi,
      ExchangeAgent01.bytecode
    );
    exchange01 = await ExchangeAgent.deploy(
      factoryV2.address,
      router.address,
      WETH.address
    );
    assert(await exchange01.deployed(), "contract was not dpeloyed");

    const Bank = await ethers.getContractFactory(Back01.abi, Back01.bytecode);
    bank01 = await Bank.deploy(factoryV2.address, router.address, WETH.address);
    assert(await bank01.deployed(), "contract was not deployed");
  });

  it("USDC -> WETH", async () => {
    await USDC.connect(guest).approve(
      exchange01.address,
      ethers.constants.MaxUint256
    );
    await WETH.connect(guest).approve(
      exchange01.address,
      ethers.constants.MaxUint256
    );
    await exchange01
      .connect(guest)
      .addLiquidity(
        USDC.address,
        WETH.address,
        expandTo18Decimlas(10),
        expandTo18Decimlas(10)
      );

    const pairAddress = await factoryV2.getPair(USDC.address, WETH.address);
    pair = new Contract(
      pairAddress,
      JSON.stringify(IUniswapV2Pair.abi),
      ethers.provider
    );

    console.log(await pair.getReserves());
    console.log((await WETH.balanceOf(guest1.address)).toString());

    await USDC.connect(guest1).approve(
      exchange01.address,
      ethers.constants.MaxUint256
    );
    await exchange01
      .connect(guest1)
      .swap(
        USDC.address,
        WETH.address,
        expandTo18Decimlas(10),
        0,
        guest1.address,
        false
      );

    console.log(await pair.getReserves());
    console.log((await WETH.balanceOf(guest1.address)).toString());
  });

  it("illiquidity Swap", async () => {
    const JPYC9 = await ethers.getContractFactory(ERC20.abi, ERC20.bytecode);
    const JPYC = await JPYC9.connect(guest1).deploy(10000, "JPY Coin", "JPYC");
    assert(await JPYC.deployed(), "contract was not deployed");

    await JPYC.connect(guest1).approve(
      router.address,
      ethers.constants.MaxUint256
    );
    await WETH.connect(guest1).approve(
      router.address,
      ethers.constants.MaxUint256
    );
    await expect(
      exchange01
        .connect(guest1)
        .swap(
          JPYC.address,
          WETH.address,
          expandTo18Decimlas(10),
          0,
          guest1.address,
          false
        )
    ).to.be.reverted;
    console.log((await JPYC.balanceOf(guest1.address)).toString());
    console.log((await WETH.balanceOf(guest1.address)).toString());
  });
  it("Payment after exchange", async () => {
    await USDC.connect(guest).approve(
      exchange01.address,
      ethers.constants.MaxUint256
    );
    await WETH.connect(guest).approve(
      exchange01.address,
      ethers.constants.MaxUint256
    );
    await exchange01
      .connect(guest)
      .addLiquidity(
        USDC.address,
        WETH.address,
        expandTo18Decimlas(10),
        expandTo18Decimlas(10)
      );
    console.log((await USDC.balanceOf(guest1.address)).toString() / 10 ** 18);
    await USDC.connect(guest1).approve(
      exchange01.address,
      ethers.constants.MaxUint256
    );
    await WETH.connect(guest1).approve(
      exchange01.address,
      ethers.constants.MaxUint256
    );
    await exchange01
      .connect(guest1)
      .swap(
        USDC.address,
        WETH.address,
        expandTo18Decimlas(10),
        expandTo18Decimlas(2),
        guest1.address,
        true
      );
    console.log((await WETH.balanceOf(guest1.address)).toString());
    console.log((await WETH.balanceOf(exchange01.address)).toString());
  });
  it("Direct remittance to destination", async () => {
    await USDC.connect(guest).approve(
      bank01.address,
      ethers.constants.MaxUint256
    );
    await WETH.connect(guest).approve(
      bank01.address,
      ethers.constants.MaxUint256
    );
    await bank01
      .connect(guest)
      .addLiquidity(
        USDC.address,
        WETH.address,
        expandTo18Decimlas(10),
        expandTo18Decimlas(10)
      );
    console.log((await USDC.balanceOf(guest1.address)).toString() / 10 ** 18);
    await USDC.connect(guest1).approve(
      bank01.address,
      ethers.constants.MaxUint256
    );
    await WETH.connect(guest1).approve(
      bank01.address,
      ethers.constants.MaxUint256
    );
    await bank01
      .connect(guest1)
      .swapWithGetContract(
        USDC.address,
        WETH.address,
        expandTo18Decimlas(10),
        expandTo18Decimlas(2)
      );
  });
});
