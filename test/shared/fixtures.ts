/* eslint-disable prettier/prettier */
import { deployContract, MockProvider } from "ethereum-waffle";
import { Contract, Wallet } from "ethers";

import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";

import ERC20 from "../../artifacts/contracts/ERC20.sol/WERC20.json";
import WrappedETH from "../../artifacts/contracts/WETH.sol/WETH.json";
import UniswapV2Router02 from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import { assert } from "console";


interface V2Fixture {
  token0: Contract;
  token1: Contract;
  WETH: Contract;
  WETHPartner: Contract;
  factoryV2: Contract;
  router02: Contract;
  router: Contract;
  // pair: Contract;
  WETHPair: Contract;
}

export async function v2Fixture(
  [wallet]: Wallet[],
  provider: MockProvider,
): Promise<V2Fixture> {
  // deploy tokens
  const tokenA = await deployContract(wallet, ERC20, [1000000, "USD Coin", "USDC"]);
  const tokenB = await deployContract(wallet, ERC20, [1000000, "JPY Coin", "JPYC"]);
  const WETH = await deployContract(wallet, WrappedETH, [1000000]);
  const WETHPartner = await deployContract(wallet, ERC20, [1000000, "Wrapped ETH Partner Coin", "WETHPC"]);

  assert(await tokenA.deployed(), "contract was not deployed");
  assert(await tokenB.deployed(), "contract was not deployed");
  assert(await WETH.deployed(), "contract was not deployed");
  assert(await WETHPartner.deployed(), "contract was not deployed");

  // deplo V2
  const factoryV2 = await deployContract(wallet, UniswapV2Factory, [wallet.address]);
  assert(await factoryV2.deployed(), "contract was not deployed");

  // deploy routers
  const router02 = await deployContract(wallet, UniswapV2Router02, [factoryV2.address, WETH.address]);
  assert(await router02.deployed(), "contract was not deployed");

  // initialize V2
  await factoryV2.createPair(tokenA.address, tokenB.address);
  const pairAddress = await factoryV2.getPair(tokenA.address, tokenB.address);
  const pair = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet);

  const token0Address = await pair.token0();
  console.log(token0Address, tokenA.address);
  console.log(tokenB.address);
  // const token0 = tokenA;
  // const token1 = tokenB;
  const token0 = tokenA.address === token0Address ? tokenA : tokenB;
  const token1 = tokenB.address === token0Address ? tokenB : tokenA;

  await factoryV2.createPair(WETH.address, WETHPartner.address);
  const WETHPairAddress = await factoryV2.getPair(WETH.address, WETHPartner.address);
  const WETHPair = new Contract(WETHPairAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet);

  return {
    token0,
    token1,
    WETH,
    WETHPartner,
    factoryV2,
    router02,
    router: router02,
    // pair,
    WETHPair
  }
}
