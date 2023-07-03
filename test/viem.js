const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice, maxSupply } = require("../scripts/utils.js");
const { MerkleTree } = require('merkletreejs')
const { merkleAddresses } = require("../merkleAddresses.js");

describe("Viem Tests", function () {
  this.timeout(50000000);

  it("shows some examples of how to use the test framework", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, biteByViper, metadata } = await deployContracts();
    const biteByViperAddress = await viper.biteByViper();
    expect(biteByViperAddress).to.equal(biteByViper.address);

    await expect(viper.setBiteByViper(addr1.address))
      .to.not.be.reverted;

    await expect(viper.connect(addr1).setBiteByViper(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await viper.setPause(false)
    await viper.setStartdate(0)

    await viper.setSplitter(metadata.address)

    // mint will succeed but the EthMoved event will show the eth transfer failed
    tx = viper['mint()']({ value: correctPrice })
    await expect(tx)
      .to.emit(viper, "EthMoved")
      .withArgs(metadata.address, false, "0x", correctPrice);

    // viper still has the eth
    const balanceAfter = await ethers.provider.getBalance(viper.address);
    expect(balanceAfter).to.equal(correctPrice);
  })

})
