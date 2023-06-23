const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { readData, getPathABI, deployContracts, decodeUri, correctPrice, maxSupply } = require("../scripts/utils.js");
// const { optimize } = require("svgo");


describe("Controller Tests", function () {
  this.timeout(50000000);

  it("emits 'EthMoved' events when eth is moved", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();

    // set splitter to controller address which cannot recive eth
    await controller.setSplitter(controller.address)
    await controller.setPause(false)

    // mint will succeed but eth will be trapped in controller
    await controller.mint({ value: correctPrice })

    // first try reverting with the wrong account
    await expect(controller.connect(addr1).recoverUnsuccessfulMintPayment(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");

    // now try with correct account
    const balanceOfAddr1Before = await ethers.provider.getBalance(addr1.address);

    // recover eth stuck in controller and send to addr1
    tx = controller.recoverUnsuccessfulMintPayment(addr1.address)
    await expect(tx)
      .to.emit(controller, "EthMoved")
      .withArgs(addr1.address, true, "0x");

    const balanceOfAddr1After = await ethers.provider.getBalance(addr1.address);
    expect(balanceOfAddr1After.sub(balanceOfAddr1Before)).to.equal(correctPrice);
  })

  it("revert:Viper not set", async function () {
    const [owner, splitter] = await hre.ethers.getSigners();
    const { controller } = await deployContracts();
    await controller.setNFT(ethers.constants.AddressZero)
    await controller.setPause(false);
    await expect(controller.mint({ value: correctPrice })).to.be.revertedWith("NO NFT");
  });

  it("revert:Splitter not set", async function () {
    const [owner, splitter] = await hre.ethers.getSigners();
    const { controller } = await deployContracts();
    await controller.setSplitter(ethers.constants.AddressZero)
    await controller.setPause(false);
    await expect(controller.mint({ value: correctPrice })).to.be.revertedWith("NO SPLIT");
  });

  it("token ID is correctly correlated", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false);
    await controller.mint({ value: correctPrice });
    const tokenID = await viper.tokenOfOwnerByIndex(owner.address, 0);
    expect(tokenID).to.equal(1);
  })

  it("revert:Viper not unpaused", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller, metadata } = await deployContracts();
    await controller.setPause(true);
    await expect(controller.connect(addr1).mint({ value: correctPrice })).to.be.revertedWith(
      "PAUSED"
    );
  });

  it("revert:Mint directly from viper", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false);
    await expect(viper.mint(owner.address)).to.be.revertedWith("NOT CONTROLLER");
  });

  it("revert:controller when minting too many", async function () {
    const { controller } = await deployContracts();
    for (var mintcounter = 0; mintcounter < maxSupply; mintcounter++) {
      controller.mint({ value: correctPrice });
    }
    await expect(controller.mint({ value: correctPrice })).to.be.revertedWith("MAX SUPPLY REACHED");
  });

  it("revert:controller failed and successful mint without sending eth", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await expect(controller.mint()).to.be.revertedWith("WRONG PRICE");
    await controller.setPrice("0")

    await expect(controller.mint()).to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
  });

  it("controller mint from admin", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.adminMint(addr1.address);
    expect(await viper.ownerOf(1)).to.equal(addr1.address);
  });

  it("revert:controller mint from admin when uninitialized", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setNFT(ethers.constants.AddressZero);
    await expect(controller.adminMint(addr3.address)).to.be.revertedWith("NO NFT");
    await controller.setNFT(viper.address)
    await controller.setSplitter(ethers.constants.AddressZero)
    await expect(controller.adminMint(addr3.address)).to.be.revertedWith("NO SPLIT");
  })


  it("revert:controller from admin without admin", async function () {
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const { controller, metadata } = await deployContracts();
    await expect(controller.connect(addr3).adminMint(addr3.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("splitter test", async function () {
    const [owner, splitter, addr2, addr3, addr4] = await ethers.getSigners();

    const { viper, controller } = await deployContracts();
    await controller.connect(addr3).mint({ value: correctPrice });
    expect(await viper.ownerOf(1)).to.equal(addr3.address);
    var splitterBalance = await ethers.provider.getBalance(splitter.address);
    expect(splitterBalance == correctPrice);
  });

});
