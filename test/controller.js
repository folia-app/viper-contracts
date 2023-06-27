const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { readData, getPathABI, deployContracts, decodeUri, correctPrice, maxSupply } = require("../scripts/utils.js");
// const { optimize } = require("svgo");


describe("Controller Tests", function () {
  this.timeout(50000000);

  it("has the correct viper and biteByViper", async () => {
    const { viper, biteByViper, controller } = await deployContracts();
    const viperAddress = await controller.nft();
    const biteByViperAddress = await controller.biteByViper();
    expect(viperAddress).to.equal(viper.address);
    expect(biteByViperAddress).to.equal(biteByViper.address);
  })

  it("can only update viper, biteByViper, splitter, paused and price when owner", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller, biteByViper } = await deployContracts();
    await expect(controller.connect(addr1).setNFT(viper.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(controller.connect(addr1).setBiteByViper(biteByViper.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(controller.connect(addr1).setSplitter(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(controller.connect(addr1).setPause(false))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(controller.connect(addr1).setPrice(ethers.utils.parseEther("0.1")))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(controller.setNFT(viper.address))
      .to.not.be.reverted;
    await expect(controller.setBiteByViper(biteByViper.address))
      .to.not.be.reverted;
    await expect(controller.setSplitter(addr1.address))
      .to.not.be.reverted;
    await expect(controller.setPrice(ethers.utils.parseEther("0.1")))
      .to.not.be.reverted;
  })

  it("emits 'EthMoved' events when eth is moved", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller, metadata } = await deployContracts();

    // set splitter to metadata address which cannot recive eth
    await controller.setSplitter(metadata.address)
    await controller.setPause(false)

    const balanceBefore = await ethers.provider.getBalance(controller.address);
    expect(balanceBefore).to.equal(0);

    // mint will succeed but the EthMoved event will show the eth transfer failed
    tx = controller['mint()']({ value: correctPrice })
    await expect(tx)
      .to.emit(controller, "EthMoved")
      .withArgs(metadata.address, false, "0x", correctPrice);

    // the controller still has the eth
    const balanceAfter = await ethers.provider.getBalance(controller.address);
    expect(balanceAfter).to.equal(correctPrice);

    // only owner can call recoverUnsuccessfulMintPayment
    await expect(controller.connect(addr1).recoverUnsuccessfulMintPayment(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");


    // get the balance of the eventual recipient
    const balanceOfAddr1Before = await ethers.provider.getBalance(addr1.address);

    // recover eth stuck in controller and send to addr1 using owner address
    tx = controller.recoverUnsuccessfulMintPayment(addr1.address)
    await expect(tx)
      .to.emit(controller, "EthMoved")
      .withArgs(addr1.address, true, "0x", correctPrice);

    const balanceOfAddr1After = await ethers.provider.getBalance(addr1.address);
    expect(balanceOfAddr1After.sub(balanceOfAddr1Before)).to.equal(correctPrice);
  })

  it("revert:Viper not set", async function () {
    const [owner, splitter] = await hre.ethers.getSigners();
    const { controller } = await deployContracts();
    await controller.setNFT(ethers.constants.AddressZero)
    await controller.setPause(false);
    await expect(controller['mint()']({ value: correctPrice })).to.be.revertedWith("NO NFT");
  });

  it("revert:Splitter not set", async function () {
    const [owner, splitter] = await hre.ethers.getSigners();
    const { controller } = await deployContracts();
    await controller.setSplitter(ethers.constants.AddressZero)
    await controller.setPause(false);
    await expect(controller['mint()']({ value: correctPrice })).to.be.revertedWith("NO SPLIT");
  });
  it("revert:Bitten not set", async function () {
    const [owner, splitter] = await hre.ethers.getSigners();
    const { controller } = await deployContracts();
    await controller.setBiteByViper(ethers.constants.AddressZero)
    await controller.setPause(false);
    await expect(controller['mint()']({ value: correctPrice })).to.be.revertedWith("NO BITTEN");
  });


  it("poison fails when triggered directly", async function () {
    const [owner, splitter, addr3] = await hre.ethers.getSigners();
    const { controller } = await deployContracts();
    await controller.setPause(false);
    await controller.connect(addr3)['mint()']({ value: correctPrice });
    await expect(controller.poison(owner.address, splitter.address, 1, 1)).to.be.revertedWith("Only Viper can call poison");
  })

  it("poison fails when target owns a viper", async function () {
    const [owner, splitter, addr3, addr4] = await hre.ethers.getSigners();
    const { controller, viper } = await deployContracts();
    await controller.setPause(false);
    await controller.connect(addr3)['mint()']({ value: correctPrice });
    const tokenBalance = await viper.balanceOf(addr3.address);
    const tokenId = await viper.totalSupply()
    expect(tokenBalance).to.equal(1);
    await controller.connect(addr4)['mint()']({ value: correctPrice });
    const tokenBalance2 = await viper.balanceOf(addr4.address);
    expect(tokenBalance2).to.equal(1);

    await expect(viper.connect(addr3).transferFrom(addr3.address, addr4.address, tokenId))
      .to.be.revertedWith("Can't poison someone who owns a Viper");
  })

  it("fails to trigger poison when target has 0 balance", async function () {
    const [owner, splitter, addr3, addr4] = await hre.ethers.getSigners();
    const { controller, viper } = await deployContracts();
    await controller.setPause(false);
    await controller.connect(addr3)['mint()']({ value: correctPrice });
    const tokenId = await viper.totalSupply()
    const emptyAddress = ethers.constants.AddressZero.substring(0, 41) + "1";
    await expect(viper.connect(addr3).transferFrom(addr3.address, emptyAddress, tokenId))
      .to.be.revertedWith("Can't poison an address with 0 balance");
  })


  it("token ID is correctly correlated", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false);
    await controller['mint()']({ value: correctPrice });
    const tokenID = await viper.totalSupply()
    expect(tokenID).to.equal(1);
  })

  it("must be unpaused", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller, metadata } = await deployContracts();
    await controller.setPause(true);
    await expect(controller.connect(addr1)['mint()']({ value: correctPrice })).to.be.revertedWith(
      "PAUSED"
    );
  });

  it("fails to mint directly from viper contract", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false);
    await expect(viper.controllerMint(owner.address, 1)).to.be.revertedWith("NOT CONTROLLER");
  });

  it("succeeds to mint", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await expect(controller['mint()']({ value: correctPrice })).to.emit(viper, "Transfer")
      .to.be.revertedWith("PAUSED")

    await controller.setPause(false);
    await expect(controller['mint()']({ value: correctPrice })).to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
  })

  it("succeeds to mint with explicit recipient", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await expect(controller['mint(address)'](addr1.address, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await controller.setPause(false);
    await expect(controller['mint(address)'](addr1.address, { value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1);
  })

  it("succeeds to mint with explicit quantity", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await expect(controller.connect(addr1)['mint(uint256)'](1, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await controller.setPause(false);
    await expect(controller.connect(addr1)['mint(uint256)'](1, { value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1);
  })

  it("succeeds to mint with explicit recipient and quantity", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await expect(controller['mint(address,uint256)'](addr1.address, 1, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await controller.setPause(false);
    await expect(controller['mint(address,uint256)'](addr1.address, 1, { value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1);
  })

  it("succeeds to batch mint", async function () {
    const [owner, addr2] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false);
    await expect(controller['mint(uint256)'](5, { value: correctPrice.mul(5) }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1)
      .withArgs(ethers.constants.AddressZero, owner.address, 2)
      .withArgs(ethers.constants.AddressZero, owner.address, 3)
      .withArgs(ethers.constants.AddressZero, owner.address, 4)
      .withArgs(ethers.constants.AddressZero, owner.address, 5)

    await expect(controller.connect(addr2)['mint(uint256)'](3, { value: correctPrice.mul(3) }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr2.address, 6)
      .withArgs(ethers.constants.AddressZero, addr2.address, 7)
      .withArgs(ethers.constants.AddressZero, addr2.address, 8)

    await expect(controller['mint(uint256)'](2, { value: correctPrice.mul(2) }))
      .to.be.revertedWith("CAN'T MINT BESIDES QUANTITY OF 1, 3 OR 5")

    await expect(controller['mint(uint256)'](3, { value: correctPrice.mul(5) }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 9)
      .withArgs(ethers.constants.AddressZero, owner.address, 10)
      .withArgs(ethers.constants.AddressZero, owner.address, 11)

    await expect(controller['mint(uint256)'](5, { value: correctPrice.mul(3) }))
      .to.be.revertedWith("WRONG PRICE")
  })

  it("won't allow to mint past max supply", async function () {
    const { controller } = await deployContracts();
    await controller.setPause(false);
    for (var mintcounter = 0; mintcounter < maxSupply; mintcounter++) {
      controller['mint()']({ value: correctPrice });
    }
    await expect(controller['mint()']({ value: correctPrice })).to.be.revertedWith("MAX SUPPLY REACHED");
  });

  it("checks whether mint fails with wrong price and succeeds even when price = 0", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false);
    await expect(controller['mint()']()).to.be.revertedWith("WRONG PRICE");
    await controller.setPrice("0")

    await expect(controller['mint()']()).to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
  });

  it("controller mint from admin", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.adminMint(addr1.address, 1);
    expect(await viper.ownerOf(1)).to.equal(addr1.address);
  });

  it("fails to mint from admin when uninitialized", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setNFT(ethers.constants.AddressZero);
    await expect(controller.adminMint(addr3.address, 1)).to.be.revertedWith("NO NFT");
    await controller.setNFT(viper.address)
    await controller.setSplitter(ethers.constants.AddressZero)
    await expect(controller.adminMint(addr3.address, 1)).to.be.revertedWith("NO SPLIT");
  })


  it("fails to admin mint when not owner", async function () {
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const { controller, metadata } = await deployContracts();
    await expect(controller.connect(addr3).adminMint(addr3.address, 1)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("splitter test", async function () {
    const [owner, splitter, addr2, addr3, addr4] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false);
    await controller.connect(addr3)['mint()']({ value: correctPrice });
    expect(await viper.ownerOf(1)).to.equal(addr3.address);
    var splitterBalance = await ethers.provider.getBalance(splitter.address);
    expect(splitterBalance == correctPrice);
  });

  it("isn't susceptible to reentrancy", async function () {
    const [owner, splitter, addr2, addr3, addr4] = await ethers.getSigners();
    const { viper, controller, reEntry } = await deployContracts();
    await controller.setPause(false);
    await expect(reEntry.mint({ value: correctPrice }))
      .to.be.revertedWith("WRONG PRICE");
  })

});
