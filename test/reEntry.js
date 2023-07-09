const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice, maxSupply } = require("../scripts/utils.js");
const { MerkleTree } = require('merkletreejs')
const { merkleAddresses } = require("../merkleAddresses.js");

describe("ReEntry Tests", function () {
  this.timeout(50000000);

  it("can't mint more than total Supply with re-entry contract", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { viper, biteByViper, metadata, reEntry } = await deployContracts();
    await viper.setPrice(0)
    await viper.setPause(false)
    await viper.setStartdate(0)
    const amountToMint = 6 // more than you're supposed to be allowed to but also not the worst case scenario
    const MAX_SUPPLY = (await viper.MAX_SUPPLY()).sub(amountToMint)

    const splitter = await viper.splitter()

    for (let i = 0; i < MAX_SUPPLY; i++) {
      await viper.connect(acct1)['mint(uint256)'](1)
    }

    const totalSupply = await viper.totalSupply()
    expect(totalSupply).to.equal(MAX_SUPPLY)

    await viper.setPrice(correctPrice)

    // contract has enough money to pay for 5 more than the total number allowed
    // it's configured to keep calling mint as long as it has money
    // it will only stop if the viper contract stops sending it back excess money
    await owner.sendTransaction({
      to: reEntry.address,
      value: correctPrice.mul(amountToMint * 2)
    })

    const tx = reEntry.connect(acct2).mint({ value: correctPrice.add(1) })
    const receipt = await (await tx).wait();

    // to view all logs
    // receipt.logs.map(log => {
    //   let iface
    //   switch (log.address) {
    //     case viper.address:
    //       iface = viper.interface
    //       break;
    //     case reEntry.address:
    //       iface = reEntry.interface
    //       break;
    //     default:
    //       throw new Error(`unknown address ${log.address}`)
    //   }
    //   let parsedLog = iface.parseLog(log)
    //   console.log({ parsedLog })
    // })

    expect(receipt)
      .to.emit(viper, "EthMoved")
      .withArgs(splitter, true, "0x", correctPrice)
      .withArgs(reEntry.address, false)

    const balance = await viper.balanceOf(reEntry.address)
    expect(balance).to.equal(1)
  })

})