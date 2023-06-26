const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice } = require("../scripts/utils.js");

describe("BittenByViper Tests", function () {
  this.timeout(50000000);

  it("has the correct controller and metadata", async () => {
    const { bittenByViper, controller, metadata } = await deployContracts();
    expect(await bittenByViper.viperControllerAddress()).to.equal(controller.address);
    expect(await bittenByViper.metadata()).to.equal(metadata.address);
  })

  it("has all the correct interfaces", async () => {
    const interfaces = [
      { name: "ERC165", id: "0x01ffc9a7", supported: true },
      { name: "ERC721", id: "0x80ac58cd", supported: true },
      { name: "ERC721Metadata", id: "0x5b5e139f", supported: true },
      { name: "ERC721Enumerable", id: "0x780e9d63", supported: false },
      { name: "ERC2981", id: "0x2a55205a", supported: false },
      { name: "ERC20", id: "0x36372b07", supported: false },
    ]

    for (let i = 0; i < interfaces.length; i++) {
      const { name, id, supported } = interfaces[i];
      const { bittenByViper } = await deployContracts();
      const supportsInterface = await bittenByViper.supportsInterface(id);
      expect(supportsInterface).to.equal(supported);
    }
  })

  it("converts a token and a length from address to a token id", async () => {
    const [owner] = await ethers.getSigners();
    const { bittenByViper } = await deployContracts();

    const tests = [
      { tokenId: 0, length: 0, tokenShouldPass: true, lengthShouldPass: true },
      { tokenId: 1, length: 1, tokenShouldPass: true, lengthShouldPass: true },
      { tokenId: 5, length: 2, tokenShouldPass: true, lengthShouldPass: true },
      { tokenId: 105, length: 202, tokenShouldPass: true, lengthShouldPass: true },
      { tokenId: 512, length: 302, tokenShouldPass: false, lengthShouldPass: false }, // the tokenId is over 511 and so starts writing onto the space reserved for length
      { tokenId: 905, length: 902, tokenShouldPass: false, lengthShouldPass: false }, // the tokenId is over 511 and so starts writing onto the space reserved for length
    ]

    for (let i = 0; i < tests.length; i++) {
      const { tokenId, length, tokenShouldPass, lengthShouldPass } = tests[i];
      const combinedTokenId = await bittenByViper.getCombinedTokenId(owner.address, tokenId, length);
      const returnedTokenId = await bittenByViper.extractTokenId(combinedTokenId);
      const returnedAddress = await bittenByViper.extractAddress(combinedTokenId);
      const returnedLength = await bittenByViper.extractLength(combinedTokenId);

      expect(returnedAddress).to.equal(owner.address);

      if (tokenShouldPass) {
        expect(returnedTokenId).to.equal(tokenId);
      } else {
        expect(returnedTokenId).to.not.equal(tokenId);
      }
      if (lengthShouldPass) {
        expect(returnedLength).to.equal(length);
      } else {
        expect(returnedLength).to.not.equal(length);
      }
    }
  })

  it("can updateViperControllerAddress if owner", async () => {
    const [owner, acc2, acc3] = await ethers.getSigners();
    const { bittenByViper } = await deployContracts();

    const newMetadataAddress = acc2.address
    await bittenByViper.updateMetadataAddress(newMetadataAddress);
    const returnedMetadataAddress = await bittenByViper.metadata();
    expect(returnedMetadataAddress).to.equal(newMetadataAddress);

    await expect(bittenByViper.connect(acc2).updateMetadataAddress(acc3.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
  })


  it("can updateMetadataAddress if owner", async () => {
    const [owner, acc2, acc3] = await ethers.getSigners();
    const { bittenByViper } = await deployContracts();

    const newControllerAddress = acc2.address
    await bittenByViper.updateViperControllerAddress(newControllerAddress);
    const returnedControllerAddress = await bittenByViper.viperControllerAddress();
    expect(returnedControllerAddress).to.equal(newControllerAddress);

    await expect(bittenByViper.connect(acc2).updateViperControllerAddress(acc3.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
  })

  it("fails when poison is called from an address that is not the controller", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { bittenByViper, controller } = await deployContracts();
    await expect(bittenByViper.poison(acct1.address, acct2.address, 1, 1))
      .to.be.revertedWith("Only Controller can call poison");

    await bittenByViper.updateViperControllerAddress(owner.address)
    // expect poison to not revert
    await expect(bittenByViper.poison(acct1.address, acct2.address, 1, 1))
      .to.not.be.reverted;


  })

  it("can poison when controllerAddress is stubbed", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { bittenByViper, controller } = await deployContracts();
    await bittenByViper.updateViperControllerAddress(owner.address);

    const combinedTokenId = await bittenByViper.getCombinedTokenId(acct1.address, 1, 1);
    tx = bittenByViper.poison(acct1.address, acct2.address, 1, 1);

    await expect(tx)
      .to.emit(bittenByViper, "Transfer")
      .withArgs(acct1.address, acct2.address, combinedTokenId);

  })

  it("increments the totalSupply when poison is called", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { bittenByViper, controller } = await deployContracts();
    await bittenByViper.updateViperControllerAddress(owner.address);

    const totalSupply = await bittenByViper.totalSupply();
    await bittenByViper.poison(acct1.address, acct2.address, 1, 1);
    const newTotalSupply = await bittenByViper.totalSupply();
    expect(newTotalSupply).to.equal(totalSupply.add(1));
  })

  it("has the same metadata endpoint as viper", async () => {
    const { bittenByViper, viper } = await deployContracts();
    const metadata = await bittenByViper.tokenURI(1);
    const viperMetadata = await viper.tokenURI(1);
    expect(metadata).to.equal(viperMetadata);
  })

  it("has correct token metadata", async () => {
    const { bittenByViper, viper } = await deployContracts();
    const name = await bittenByViper.name();
    const symbol = await bittenByViper.symbol();
    expect(name).to.equal("BittenByViper");
    expect(symbol).to.equal("BBVPR");
  })

  it("has the correct balance of", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { bittenByViper, controller } = await deployContracts();
    await bittenByViper.updateViperControllerAddress(owner.address);
    const beforeBalance = await bittenByViper.balanceOf(acct2.address);
    expect(beforeBalance).to.equal(0)
    await bittenByViper.poison(acct1.address, acct2.address, 1, 1);
    const afterBalance = await bittenByViper.balanceOf(acct2.address);
    expect(afterBalance).to.equal(1)
  })

  it("can't poison the same person twice", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { bittenByViper, controller } = await deployContracts();
    await bittenByViper.updateViperControllerAddress(owner.address);
    await bittenByViper.poison(acct1.address, acct2.address, 1, 1);
    await expect(bittenByViper.poison(acct1.address, acct2.address, 1, 1))
      .to.be.revertedWith("Already bitten by a Viper");
  })

  it("can't trigger any legacy NFT functions", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { bittenByViper, controller } = await deployContracts();
    await bittenByViper.updateViperControllerAddress(owner.address);
    await bittenByViper.poison(acct1.address, acct2.address, 1, 1);
    const combinedTokenId = await bittenByViper.getCombinedTokenId(acct1.address, 1, 1);
    const ownerOf = await bittenByViper.ownerOf(combinedTokenId)
    expect(ownerOf).to.equal(ethers.constants.AddressZero);

    const getApproved = await bittenByViper.getApproved(combinedTokenId)
    expect(getApproved).to.equal(ethers.constants.AddressZero);

    const isApprovedForAll = await bittenByViper.isApprovedForAll(acct1.address, acct2.address)
    expect(isApprovedForAll).to.equal(false);

    await expect(bittenByViper.transferFrom(acct1.address, acct2.address, combinedTokenId))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(bittenByViper['safeTransferFrom(address,address,uint256)'](acct1.address, acct2.address, combinedTokenId))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(bittenByViper['safeTransferFrom(address,address,uint256,bytes)'](acct1.address, acct2.address, combinedTokenId, []))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(bittenByViper.approve(acct1.address, combinedTokenId))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(bittenByViper.setApprovalForAll(acct1.address, true))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");

  })

})