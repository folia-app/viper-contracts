const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice } = require("../scripts/utils.js");

describe("BiteByViper Tests", function () {
  this.timeout(50000000);

  it("has the correct viper and metadata", async () => {
    const { biteByViper, metadata, viper } = await deployContracts();
    expect(await biteByViper.viperAddress()).to.equal(viper.address);
    expect(await biteByViper.metadata()).to.equal(metadata.address);
  })

  it("has all the correct interfaces", async () => {
    const interfaces = [
      { name: "ERC165", id: "0x01ffc9a7", supported: true },
      { name: "ERC721", id: "0x80ac58cd", supported: true },
      { name: "ERC721Metadata", id: "0x5b5e139f", supported: true },
      { name: "ERC4906MetadataUpdate", id: "0x49064906", supported: false },
      { name: "ERC721Enumerable", id: "0x780e9d63", supported: false },
      { name: "ERC2981", id: "0x2a55205a", supported: false },
      { name: "ERC20", id: "0x36372b07", supported: false },
    ]

    for (let i = 0; i < interfaces.length; i++) {
      const { name, id, supported } = interfaces[i];
      const { biteByViper } = await deployContracts();
      const supportsInterface = await biteByViper.supportsInterface(id);
      expect(supportsInterface).to.equal(supported);
    }
  })

  it("converts a token and a length from address to a token id", async () => {
    const [owner] = await ethers.getSigners();
    const { biteByViper } = await deployContracts();

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
      const combinedTokenId = await biteByViper.getCombinedTokenId(owner.address, tokenId, length);
      const returnedTokenId = await biteByViper.extractTokenId(combinedTokenId);
      const returnedAddress = await biteByViper.extractAddress(combinedTokenId);
      const returnedLength = await biteByViper.extractLength(combinedTokenId);

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

  it("can updateMetadataAddress if owner", async () => {
    const [owner, acc2, acc3] = await ethers.getSigners();
    const { biteByViper } = await deployContracts();

    const newMetadataAddress = acc2.address
    await biteByViper.updateMetadataAddress(newMetadataAddress);
    const returnedMetadataAddress = await biteByViper.metadata();
    expect(returnedMetadataAddress).to.equal(newMetadataAddress);

    await expect(biteByViper.connect(acc2).updateMetadataAddress(acc3.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
  })


  it("can updateViperAddress if owner", async () => {
    const [owner, acc2, acc3] = await ethers.getSigners();
    const { biteByViper } = await deployContracts();

    const newViperAddress = acc2.address
    await biteByViper.updateViperAddress(newViperAddress);
    const returnedViperAddress = await biteByViper.viperAddress();
    expect(returnedViperAddress).to.equal(newViperAddress);

    await expect(biteByViper.connect(acc2).updateViperAddress(acc3.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
  })

  it("fails when bite is called from an address that is not the viper", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { biteByViper, viper } = await deployContracts();
    await expect(biteByViper.bite(acct1.address, acct2.address, 1, 1))
      .to.be.revertedWith("ONLY VIPER");

    await biteByViper.updateViperAddress(owner.address)
    // expect bite to not revert
    await expect(biteByViper.bite(acct1.address, acct2.address, 1, 1))
      .to.not.be.reverted;
  })

  it("can bite when viperAddress is stubbed", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { biteByViper, viper } = await deployContracts();
    await biteByViper.updateViperAddress(owner.address);

    const combinedTokenId = await biteByViper.getCombinedTokenId(acct1.address, 1, 1);
    tx = biteByViper.bite(acct1.address, acct2.address, 1, 1);

    await expect(tx)
      .to.emit(biteByViper, "Transfer")
      .withArgs(acct1.address, acct2.address, combinedTokenId);

  })

  it("increments the totalSupply when bite is called", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { biteByViper, viper } = await deployContracts();
    await biteByViper.updateViperAddress(owner.address);

    const totalSupply = await biteByViper.totalSupply();
    await biteByViper.bite(acct1.address, acct2.address, 1, 1);
    const newTotalSupply = await biteByViper.totalSupply();
    expect(newTotalSupply).to.equal(totalSupply.add(1));
  })

  it("has the same metadata endpoint as viper", async () => {
    const { biteByViper, viper } = await deployContracts();
    const metadata = await biteByViper.tokenURI(1);
    const viperMetadata = await viper.tokenURI(1);
    expect(metadata).to.equal(viperMetadata);
  })

  it("has correct token metadata", async () => {
    const { biteByViper } = await deployContracts();
    const name = await biteByViper.name();
    const symbol = await biteByViper.symbol();
    expect(name).to.equal("BiteByViper");
    expect(symbol).to.equal("BBVPR");
  })

  it("has the correct balance of", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { biteByViper } = await deployContracts();
    await biteByViper.updateViperAddress(owner.address);
    const beforeBalance = await biteByViper.balanceOf(acct2.address);
    expect(beforeBalance).to.equal(0)
    await biteByViper.bite(acct1.address, acct2.address, 1, 1);
    const afterBalance = await biteByViper.balanceOf(acct2.address);
    expect(afterBalance).to.equal(1)
  })

  it("can't bite the same person twice", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { biteByViper } = await deployContracts();
    await biteByViper.updateViperAddress(owner.address);
    await biteByViper.bite(acct1.address, acct2.address, 1, 1);
    await expect(biteByViper.bite(acct1.address, acct2.address, 1, 2))
      .to.be.revertedWith("YOU JUST BIT THEM");
  })

  it("can't trigger any legacy NFT functions", async () => {
    const [owner, acct1, acct2] = await ethers.getSigners();
    const { biteByViper } = await deployContracts();
    await biteByViper.updateViperAddress(owner.address);
    await biteByViper.bite(acct1.address, acct2.address, 1, 1);
    const combinedTokenId = await biteByViper.getCombinedTokenId(acct1.address, 1, 1);

    // except ownerOf
    const ownerOf = await biteByViper.ownerOf(combinedTokenId)
    expect(ownerOf).to.equal(acct2.address);

    const getApproved = await biteByViper.getApproved(combinedTokenId)
    expect(getApproved).to.equal(ethers.constants.AddressZero);

    const isApprovedForAll = await biteByViper.isApprovedForAll(acct1.address, acct2.address)
    expect(isApprovedForAll).to.equal(false);

    await expect(biteByViper.transferFrom(acct1.address, acct2.address, combinedTokenId))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(biteByViper['safeTransferFrom(address,address,uint256)'](acct1.address, acct2.address, combinedTokenId))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(biteByViper['safeTransferFrom(address,address,uint256,bytes)'](acct1.address, acct2.address, combinedTokenId, []))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(biteByViper.approve(acct1.address, combinedTokenId))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");
    await expect(biteByViper.setApprovalForAll(acct1.address, true))
      .to.be.revertedWith("VIPER BITES CAN'T BE CURED");

  })

})