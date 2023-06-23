const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice } = require("../scripts/utils.js");

describe("Viper Tests", function () {
  this.timeout(50000000);

  it("has all the correct interfaces", async () => {
    const interfaces = [
      { name: "ERC165", id: "0x01ffc9a7", supported: true },
      { name: "ERC721", id: "0x80ac58cd", supported: true },
      { name: "ERC721Metadata", id: "0x5b5e139f", supported: true },
      { name: "ERC721Enumerable", id: "0x780e9d63", supported: true },
      { name: "ERC2981", id: "0x2a55205a", supported: true },
      { name: "ERC20", id: "0x36372b07", supported: false },
    ]

    for (let i = 0; i < interfaces.length; i++) {
      const { name, id, supported } = interfaces[i];
      const { viper } = await deployContracts();
      const supportsInterface = await viper.supportsInterface(id);
      expect(supportsInterface).to.equal(supported);
    }
  })

  it("has the correct royalty info", async () => {
    const [acct1, acct2, acct3] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.mint({ value: correctPrice });
    const splitter = await controller.splitter();
    const royaltyInfo = await viper.royaltyInfo(1, correctPrice);

    // royalty amount is 10% of the correctPrice
    const royaltyAmount = correctPrice.div(10);

    expect(royaltyInfo[0]).to.equal(splitter);
    expect(royaltyInfo[1]).to.equal(royaltyAmount);

    // change the royalty percentage to 20% and confirm it works
    await viper.setRoyaltyPercentage(acct3.address, 2000)

    const newRoyaltyInfo = await viper.royaltyInfo(1, correctPrice);
    // royalty amount is 20% of the correctPrice
    const newRoyaltyAmount = correctPrice.div(5);

    expect(newRoyaltyInfo[0]).to.equal(acct3.address);
    expect(newRoyaltyInfo[1]).to.equal(newRoyaltyAmount);
  })

  it("can only be transferred by the non-owner", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.mint({ value: correctPrice });
    await expect(viper.connect(addr1).transferFrom(owner.address, addr1.address, 1))
      .to.be.revertedWith("ERC721: caller is not token owner or approved");
    // await expect(viper.connect(addr1).safeTransferFrom(owner.address, addr1.address, 1))
    //   .to.be.revertedWith("ERC721: caller is not token owner or approved");
  })

  it("validate second mint event", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await expect(controller.mint({ value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
    await expect(controller.connect(addr1).mint({ value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 2);
  });


  it("poisons someone using transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.mint({ value: correctPrice });
    await controller.connect(addr1).mint({ value: correctPrice });
    await viper.connect(addr1).transferFrom(addr1.address, addr2.address, 2);
    await expect(viper.connect(addr2).transferFrom(addr2.address, addr1.address, 2))
      .to.be.revertedWith("ERC721: caller is not token owner or approved");
  })
});
