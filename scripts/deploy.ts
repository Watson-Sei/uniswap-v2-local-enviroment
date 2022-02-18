// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { assert } from "console";
import { ethers } from "hardhat";
import ERC20 from "../artifacts/contracts/ERC20.sol/WERC20.json";
import WrappedETH from "../artifacts/contracts/WETH.sol/WETH.json";
// eslint-disable-next-line node/no-missing-import
import { expandTo18Decimlas } from "../test/shared/utilities";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const [owner, addr1] = await ethers.getSigners();

  // Deploy Tokens
  // USDC
  const USDC9 = await ethers.getContractFactory(ERC20.abi, ERC20.bytecode);
  const USDC = await USDC9.connect(addr1).deploy(100000, "USD Coin", "USDC");
  assert(USDC.deployed(), "contract was not deployed");
  // JPYC
  const JPYC9 = await ethers.getContractFactory(ERC20.abi, ERC20.bytecode);
  const JPYC = await JPYC9.connect(addr1).deploy(100000, "JPY Coin", "JPYC");
  assert(JPYC.deployed(), "contract was not deployed");
  // WETH
  const WETH9 = await ethers.getContractFactory(
    WrappedETH.abi,
    WrappedETH.bytecode
  );
  const WETH = await WETH9.connect(owner).deploy(100000);
  assert(WETH.deployed(), "cotract was not deployed");

  // send WETH for addr1
  await WETH.connect(owner).transfer(addr1.address, expandTo18Decimlas(100), {
    from: owner.address,
  });
  assert(
    (await WETH.balanceOf(addr1.address)).toString() / 10 ** 18 === 100,
    "WETH is not enough"
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
