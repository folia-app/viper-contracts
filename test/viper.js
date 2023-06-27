const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice, maxSupply } = require("../scripts/utils.js");

describe("Viper Tests", function () {
  this.timeout(50000000);

  it("has the correct controller and metadata", async () => {
    const { viper, controller, metadata } = await deployContracts();
    const controllerAddress = await viper.controller();
    const metadataAddress = await viper.metadata();
    expect(controllerAddress).to.equal(controller.address);
    expect(metadataAddress).to.equal(metadata.address);
  })

  it("has the correct max supply", async () => {
    const { viper } = await deployContracts();
    const maxSupply_ = await viper.MAX_SUPPLY();
    expect(maxSupply_).to.equal(468);
  })

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
    await controller.setPause(false)
    await controller['mint()']({ value: correctPrice });
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

  it("can only be transferred by the approved non-owner (happy path)", async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper, controller, bittenByViper } = await deployContracts();
    await controller.setPause(false)
    await controller['mint()']({ value: correctPrice });
    const tokenId = (await viper.totalSupply())
    // first token should be tokenId 1
    expect(tokenId).to.equal(1);

    // length begins as 0 and saved in array which is 0 indexed so subtract 1
    const tokenLength = (await viper.lengths(tokenId.sub(1)))
    expect(tokenLength).to.equal(0);

    // can't transfer a token you don't own or aren't approved for
    await expect(viper.connect(addr1).transferFrom(owner.address, addr1.address, tokenId))
      .to.be.revertedWith("TransferCallerNotOwnerNorApproved()");

    // combinedTokenId uses the length after it's been successfully transferred, which will be 1 more than current
    const combinedTokenId = await bittenByViper.getCombinedTokenId(owner.address, tokenId, tokenLength.add(1));
    tx = viper.connect(owner).transferFrom(owner.address, addr1.address, tokenId)

    // transfer from doesn't actually transfer
    // it emits the transfer event on the BittenByViper contract instead
    // which is how you bite/poison someone
    await expect(tx)
      .to.emit(bittenByViper, "Transfer")
      .withArgs(owner.address, addr1.address, combinedTokenId);

    // length should be 1 now since it grows every time someone is bitten/poisoned
    const tokenLengthAfterTransfer = await viper.lengths(tokenId)
    expect(tokenLengthAfterTransfer).to.equal(1);

    // viper didn't change owners since only a bite/poison happened
    const ownerOfToken = await viper.ownerOf(tokenId);
    expect(ownerOfToken).to.equal(owner.address);

    // approve addr2 (stand in for a marketplace contract) to transfer the token
    await expect(viper.connect(owner).approve(addr2.address, tokenId))
      .to.not.be.reverted;

    // when the approved address transfers the token, it should actually be transferred
    await expect(viper.connect(addr2).transferFrom(owner.address, addr1.address, tokenId))
      .to.not.be.reverted;

    // recipient is now the owner of the token
    const newOwnerOfToken = await viper.ownerOf(tokenId);
    expect(newOwnerOfToken).to.equal(addr1.address);
  })

  it("uses the same tokenURI as bittenByViper", async () => {
    const { viper, bittenByViper } = await deployContracts();
    const tokenURI = await viper.tokenURI(1);
    const bittenByViperTokenURI = await bittenByViper.tokenURI(1);
    expect(tokenURI).to.equal(bittenByViperTokenURI);
  })

  it("can only controllerMint when called from the controller address", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();

    await expect(viper.controllerMint(addr1.address, 1))
      .to.be.revertedWith("NOT CONTROLLER");

  })

  it("is also possible to mint from viper contract directly", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false)
    await viper.connect(addr1)['mint()']({ value: correctPrice })

    const tokenBalance = await viper.balanceOf(addr1.address);
    expect(tokenBalance).to.equal(1);

    const totalSupply = await viper.totalSupply()
    expect(totalSupply).to.equal(1);
  })

  it("validate second mint event", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPause(false)
    await expect(controller['mint()']({ value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
    await expect(controller.connect(addr1)['mint()']({ value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 2);
  });

  it("has the correct max supply", async function () {
    const { viper } = await deployContracts();
    const maxSupply_ = await viper.MAX_SUPPLY();
    expect(maxSupply_).to.equal(maxSupply);
  })

  it("mints out and throws an error afterwards", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await controller.setPrice(0)
    const maxSupply_ = await viper.MAX_SUPPLY();
    await controller.setPause(false)
    for (let i = 0; i < maxSupply_; i++) {
      await controller['mint()']();
    }

    await expect(controller['mint()']())
      .to.be.revertedWith("MAX SUPPLY REACHED");
  })


  it("poisons someone using transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper, controller, bittenByViper } = await deployContracts();
    await controller.setPause(false)
    await controller.connect(addr1)['mint()']({ value: correctPrice });

    const ownerOfTokenId1 = await viper.ownerOf(1);
    expect(ownerOfTokenId1).to.equal(addr1.address);

    const combinedTokenId = await bittenByViper.getCombinedTokenId(addr1.address, 1, 1);

    await expect(viper.connect(addr1).transferFrom(addr1.address, addr2.address, 1))
      .to.emit(bittenByViper, "Transfer")
      .withArgs(addr1.address, addr2.address, combinedTokenId);

    // still owner
    const ownerOfTokenId1AfterTransfer = await viper.ownerOf(1);
    expect(ownerOfTokenId1AfterTransfer).to.equal(addr1.address);


    await expect(viper.connect(addr2).transferFrom(addr2.address, addr1.address, 1))
      .to.be.revertedWith("TransferFromIncorrectOwner()");

  })


  it("can't update onlyOwner functions if not owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, controller } = await deployContracts();
    await expect(viper.connect(addr1).setController(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(viper.connect(addr1).setMetadata(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(viper.connect(addr1).setRoyaltyPercentage(addr1.address, 1))
      .to.be.revertedWith("Ownable: caller is not the owner");
  })
});
