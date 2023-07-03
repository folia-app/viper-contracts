const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice, maxSupply } = require("../scripts/utils.js");
const { MerkleTree } = require('merkletreejs')
const { merkleAddresses } = require("../merkleAddresses.js");

describe("Viper Tests", function () {
  this.timeout(50000000);

  // TODO: add tests for the following:
  // - fallback mint
  // - metadata event emitted
  // - bite an address with 0 balanc e(maybe already did?)
  // - tests to confirm start date is correct date
  // - check re-entry with new refunding eth logic
  // - add more pause / start date tests + premint

  it("has the correct biteByViper, metadata and splitter", async () => {
    const [owner, splitter] = await ethers.getSigners();
    const { viper, biteByViper, metadata } = await deployContracts();
    const biteByViperAddress = await viper.biteByViper();
    expect(biteByViperAddress).to.equal(biteByViper.address);
    const metadataAddress = await viper.metadata();
    expect(metadataAddress).to.equal(metadata.address);
    const splitterAddress = await viper.splitter()
    expect(splitterAddress).to.equal(splitter.address);
  })

  it("onlyOwner functions are really only Owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();

    await expect(viper.connect(addr1).setBiteByViper(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setMetadata(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setSplitter(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setPause(false))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setPrice(ethers.utils.parseEther("0.1")))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setRoyaltyPercentage(addr1.address, 1))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setStartdate(0))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setPremint(0))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(viper.connect(addr1).setMerkleRoot("0xcedaa7d5476066e2c0ccb625e3e66e2e88db2ec3bdb457c3bd92faf5913cee0a"))
      .to.be.revertedWith("Ownable: caller is not the owner");


    await expect(viper.setBiteByViper(addr1.address))
      .to.not.be.reverted;

    await expect(viper.setMetadata(addr1.address))
      .to.not.be.reverted;

    await expect(viper.setSplitter(addr1.address))
      .to.not.be.reverted;

    await expect(viper.setPause(false))
      .to.not.be.reverted;

    await expect(viper.setPrice(ethers.utils.parseEther("0.1")))
      .to.not.be.reverted;

    await expect(viper.setRoyaltyPercentage(addr1.address, 1))
      .to.not.be.reverted;

    await expect(viper.setStartdate(0))
      .to.not.be.reverted;

    await expect(viper.setPremint(0))
      .to.not.be.reverted;

    await expect(viper.setMerkleRoot("0xcedaa7d5476066e2c0ccb625e3e66e2e88db2ec3bdb457c3bd92faf5913cee0a"))
      .to.not.be.reverted;
  })

  it("has the correct max supply", async function () {
    const { viper } = await deployContracts();
    const maxSupply_ = await viper.MAX_SUPPLY();
    expect(maxSupply_).to.equal(maxSupply);
  })

  it("has all the correct interfaces", async () => {
    const interfaces = [
      { name: "ERC165", id: "0x01ffc9a7", supported: true },
      { name: "ERC721", id: "0x80ac58cd", supported: true },
      { name: "ERC721Metadata", id: "0x5b5e139f", supported: true },
      { name: "ERC4906MetadataUpdate", id: "0x49064906", supported: true },
      { name: "ERC721Enumerable", id: "0x780e9d63", supported: false },
      { name: "ERC2981", id: "0x2a55205a", supported: true },
      { name: "ERC20", id: "0x36372b07", supported: false },
    ]

    for (let i = 0; i < interfaces.length; i++) {
      const { name, id, supported } = interfaces[i];
      const { viper } = await deployContracts();
      const supportsInterface = await viper.supportsInterface(id);
      expect(name + supportsInterface).to.equal(name + supported);
    }
  })


  it("emits 'EthMoved' events when eth is moved", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { viper, metadata } = await deployContracts();

    // set splitter to metadata address which cannot recive eth
    await viper.setSplitter(metadata.address)
    await viper.setPause(false)
    await viper.setStartdate(0)

    const balanceBefore = await ethers.provider.getBalance(viper.address);
    expect(balanceBefore).to.equal(0);

    // mint will succeed but the EthMoved event will show the eth transfer failed
    tx = viper['mint()']({ value: correctPrice })
    await expect(tx)
      .to.emit(viper, "EthMoved")
      .withArgs(metadata.address, false, "0x", correctPrice);

    // viper still has the eth
    const balanceAfter = await ethers.provider.getBalance(viper.address);
    expect(balanceAfter).to.equal(correctPrice);

    // only owner can call recoverUnsuccessfulMintPayment
    await expect(viper.connect(addr1).recoverUnsuccessfulMintPayment(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");


    // get the balance of the eventual recipient
    const balanceOfAddr1Before = await ethers.provider.getBalance(addr1.address);

    // recover eth stuck in viper and send to addr1 using owner address
    tx = viper.recoverUnsuccessfulMintPayment(addr1.address)
    await expect(tx)
      .to.emit(viper, "EthMoved")
      .withArgs(addr1.address, true, "0x", correctPrice);

    const balanceOfAddr1After = await ethers.provider.getBalance(addr1.address);
    expect(balanceOfAddr1After.sub(balanceOfAddr1Before)).to.equal(correctPrice);
  })

  it("fails when unitialized", async function () {
    const [owner] = await ethers.getSigners();
    // deploy Viper without setting biteByViper
    const Viper = await ethers.getContractFactory("Viper");
    const viper = await Viper.deploy(owner.address, owner.address);
    await viper.deployed();
    await viper.setPause(false);
    await viper.setStartdate(0)
    await expect(viper['mint()']({ value: correctPrice }))
      .to.be.revertedWith("NO BITE BY VIPER ADDRESS");
  });

  it("fails to adminMint when uninitialized", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    // deploy Viper without setting biteByViper
    const Viper = await ethers.getContractFactory("Viper");
    const viper = await Viper.deploy(owner.address, owner.address);
    await viper.deployed();

    await expect(viper.adminMint(addr3.address, 1))
      .to.be.revertedWith("NO BITE BY VIPER ADDRESS");
  })

  it("fails to adminMint when not owner", async function () {
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await expect(viper.connect(addr3).adminMint(addr3.address, 1))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });


  it("revert:Splitter not set", async function () {
    const [owner, splitter] = await hre.ethers.getSigners();
    const Viper = await ethers.getContractFactory("Viper");
    await expect(Viper.deploy(owner.address, ethers.constants.AddressZero))
      .to.be.reverted;
  });

  it("sends money to splitter correctly", async function () {
    const [owner, splitter, addr2, addr3, addr4] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false);
    await viper.setStartdate(0)
    await viper.connect(addr3)['mint()']({ value: correctPrice });
    expect(await viper.ownerOf(1)).to.equal(addr3.address);
    var splitterBalance = await ethers.provider.getBalance(splitter.address);
    expect(splitterBalance == correctPrice);
  });

  it("has the correct royalty info", async () => {
    const [acct1, acct2, acct3] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    await viper['mint()']({ value: correctPrice });
    const splitter = await viper.splitter();
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


  it("uses the same tokenURI as biteByViper", async () => {
    const { viper, biteByViper } = await deployContracts();
    const tokenURI = await viper.tokenURI(1);
    const biteByViperTokenURI = await biteByViper.tokenURI(1);
    expect(tokenURI).to.equal(biteByViperTokenURI);
  })

  it("must be unpaused", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(true);
    await viper.setStartdate(0)
    await expect(viper.connect(addr1)['mint()']({ value: correctPrice }))
      .to.be.revertedWith("PAUSED");
  });

  //
  // Mint related tests
  //

  it("succeeds to mint", async function () {
    const [owner] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await expect(viper['mint()']({ value: correctPrice })).to.emit(viper, "Transfer")
      .to.be.revertedWith("PAUSED")

    await viper.setPause(false);
    await viper.setStartdate(0)
    await expect(viper['mint()']({ value: correctPrice })).to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
  })


  it("succeeds to mint with explicit recipient", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await expect(viper['mint(address)'](addr1.address, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await viper.setPause(false);
    await viper.setStartdate(0)
    await expect(viper['mint(address)'](addr1.address, { value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1);
  })

  it("succeeds to mint with explicit quantity", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await expect(viper.connect(addr1)['mint(uint256)'](1, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await viper.setPause(false);
    await viper.setStartdate(0)
    await expect(viper.connect(addr1)['mint(uint256)'](1, { value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1);
  })

  it("succeeds to mint with explicit recipient and quantity", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await expect(viper['mint(address,uint256)'](addr1.address, 1, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await viper.setPause(false);
    await viper.setStartdate(0)
    await expect(viper['mint(address,uint256)'](addr1.address, 1, { value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1);
  })

  it("succeeds to batch mint", async function () {
    const [owner, addr2] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false);
    await viper.setStartdate(0)
    await expect(viper['mint(uint256)'](5, { value: correctPrice.mul(5) }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1)
      .withArgs(ethers.constants.AddressZero, owner.address, 2)
      .withArgs(ethers.constants.AddressZero, owner.address, 3)
      .withArgs(ethers.constants.AddressZero, owner.address, 4)
      .withArgs(ethers.constants.AddressZero, owner.address, 5)

    await expect(viper.connect(addr2)['mint(uint256)'](3, { value: correctPrice.mul(3) }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr2.address, 6)
      .withArgs(ethers.constants.AddressZero, addr2.address, 7)
      .withArgs(ethers.constants.AddressZero, addr2.address, 8)

    await expect(viper['mint(uint256)'](2, { value: correctPrice.mul(2) }))
      .to.be.revertedWith("CAN'T MINT BESIDES QUANTITY OF 1, 3 OR 5")

    await expect(viper['mint(uint256)'](3, { value: correctPrice.mul(5) }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 9)
      .withArgs(ethers.constants.AddressZero, owner.address, 10)
      .withArgs(ethers.constants.AddressZero, owner.address, 11)

    await expect(viper['mint(uint256)'](5, { value: correctPrice.mul(3) }))
      .to.be.revertedWith("WRONG PRICE")
  })

  it("token ID is correctly correlated", async function () {
    const { viper } = await deployContracts();
    await viper.setPause(false);
    await viper.setStartdate(0)
    await viper['mint()']({ value: correctPrice });
    const tokenID = await viper.totalSupply()
    expect(tokenID).to.equal(1);
  })

  it("validate second mint event", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    await expect(viper['mint()']({ value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
    await expect(viper.connect(addr1)['mint()']({ value: correctPrice }))
      .to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 2);
  });

  it("checks whether mint fails with wrong price and succeeds even when price = 0", async function () {
    const [owner] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false);
    await viper.setStartdate(0)
    await expect(viper['mint()']())
      .to.be.revertedWith("WRONG PRICE");
    await viper.setPrice("0")

    await expect(viper['mint()']()).to.emit(viper, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
  });

  it("adminMint from owner address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.adminMint(addr1.address, 1);
    expect(await viper.ownerOf(1)).to.equal(addr1.address);
  });

  it("mints out and throws an error afterwards", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPrice(0)
    const maxSupply_ = await viper.MAX_SUPPLY();
    await viper.setPause(false)
    await viper.setStartdate(0)

    for (let i = 0; i < maxSupply_; i++) {
      await viper['mint()']();
    }

    await expect(viper['mint()']())
      .to.be.revertedWith("MAX SUPPLY REACHED");

    await expect(viper['mint(uint256)'](3))
      .to.be.revertedWith("MAX SUPPLY REACHED");

  })

  it("almost mints out then tries to mint more than are left", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPrice(0)
    const maxSupply_ = await viper.MAX_SUPPLY();
    await viper.setPause(false)
    await viper.setStartdate(0)

    for (let i = 0; i < maxSupply_.sub(1); i++) {
      await viper['mint()']();
    }
    await expect(viper.connect(addr1)['mint(uint256)'](5))
      .to.not.be.reverted;
    const balance = await viper.balanceOf(addr1.address);
    expect(balance).to.equal(1);

    // TODO: make sure that the correct amount of eth was spent
  })

  it("contract contains correct merkle root", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { viper } = await deployContracts();
    const tree = new MerkleTree(
      merkleAddresses.map(ethers.utils.keccak256),
      ethers.utils.keccak256,
      { sortPairs: true },
    );

    const viperRoot = await viper.merkleRoot()
    const treeRoot = "0x" + tree.getRoot().toString('hex')
    expect(viperRoot).to.equal(treeRoot);
  })

  it("correctly mints using allowlist created for tests", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper } = await deployContracts();

    const addresses = [owner.address, addr1.address]

    const tree = new MerkleTree(
      addresses.map(ethers.utils.keccak256),
      ethers.utils.keccak256,
      { sortPairs: true },
    );

    const newRoot = "0x" + tree.getRoot().toString('hex')
    await viper.setMerkleRoot(newRoot)

    const contractRoot = await viper.merkleRoot()
    expect(contractRoot).to.equal(newRoot);

    const hashedAddress = ethers.utils.keccak256(owner.address);
    const hexProof = tree.getHexProof(hashedAddress);

    await viper.setPrice(0)
    await viper.setPause(false)
    await viper.setPremint(0)

    // function mintAllowList(uint256 quantity, bytes32[] calldata _proof) external payable {
    await expect(viper.mintAllowList(1, hexProof))
      .to.emit(viper, "Transfer")

    const balance = await viper.balanceOf(owner.address);
    expect(balance).to.equal(1);

    const failHashedAddress = ethers.utils.keccak256(addr2.address);
    const failHexProof = tree.getHexProof(failHashedAddress);
    await expect(viper.connect(addr2).mintAllowList(1, failHexProof))
      .to.be.revertedWith("You are not on the allowlist");
  })

  it("correctly allows minting after start time", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper } = await deployContracts();
    // get current block time
    const blockTime = (await ethers.provider.getBlock('latest')).timestamp;

    // add 1 day to block time
    const startTime = blockTime + 86400
    await viper.setStartdate(startTime)
    await viper.setPause(false)
    await viper.setPrice(0)
    await expect(viper['mint()']())
      .to.be.revertedWith("PAUSED");
    await ethers.provider.send('evm_increaseTime', [86401])
    await expect(viper['mint()']()).to.emit(viper, "Transfer")
      .to.emit(viper, "Transfer")
  })

  //
  // TransferFrom tests
  //

  it("can only be transferred by the approved non-owner (marketplace happy path)", async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper, biteByViper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    await viper['mint()']({ value: correctPrice });
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
    const combinedTokenId = await biteByViper.getCombinedTokenId(owner.address, tokenId, tokenLength.add(1));
    tx = viper.connect(owner).transferFrom(owner.address, addr1.address, tokenId)

    // transfer from doesn't actually transfer
    // it emits the transfer event on the BiteByViper contract instead
    // which is how you bite someone
    await expect(tx)
      .to.emit(biteByViper, "Transfer")
      .withArgs(owner.address, addr1.address, combinedTokenId);

    // length should be 1 now since it grows every time someone is bitten
    const tokenLengthAfterTransfer = await viper.lengths(tokenId)
    expect(tokenLengthAfterTransfer).to.equal(1);

    // viper didn't change owners since only a bite happened
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

  it("can't bite yourself", async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper, biteByViper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    await viper['mint()']({ value: correctPrice });
    const tokenId = (await viper.totalSupply())
    await expect(viper.transferFrom(owner.address, owner.address, tokenId))
      .to.be.revertedWith("Can't bite yourself");
  })

  it("fails to trigger bite when target has 0 balance", async function () {
    const [owner, splitter, addr3, addr4] = await hre.ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false);
    await viper.setStartdate(0)
    await viper.connect(addr3)['mint()']({ value: correctPrice });
    const tokenId = await viper.totalSupply()
    const emptyAddress = ethers.constants.AddressZero.substring(0, 41) + "1";
    await expect(viper.connect(addr3).transferFrom(addr3.address, emptyAddress, tokenId))
      .to.be.revertedWith("Can't bite an address with 0 balance");
  })

  it("bites someone using transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper, biteByViper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    await viper.connect(addr1)['mint()']({ value: correctPrice });

    const ownerOfTokenId1 = await viper.ownerOf(1);
    expect(ownerOfTokenId1).to.equal(addr1.address);

    const combinedTokenId = await biteByViper.getCombinedTokenId(addr1.address, 1, 1);

    await expect(viper.connect(addr1).transferFrom(addr1.address, addr2.address, 1))
      .to.emit(biteByViper, "Transfer")
      .withArgs(addr1.address, addr2.address, combinedTokenId);

    // still owner
    const ownerOfTokenId1AfterTransfer = await viper.ownerOf(1);
    expect(ownerOfTokenId1AfterTransfer).to.equal(addr1.address);


    await expect(viper.connect(addr2).transferFrom(addr2.address, addr1.address, 1))
      .to.be.revertedWith("NOT OWNER");
  })

  it("bites someone using safeTransferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { viper, biteByViper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    await viper.connect(addr1)['mint()']({ value: correctPrice });

    const ownerOfTokenId1 = await viper.ownerOf(1);
    expect(ownerOfTokenId1).to.equal(addr1.address);

    const combinedTokenId = await biteByViper.getCombinedTokenId(addr1.address, 1, 1);

    await expect(viper.connect(addr1)['safeTransferFrom(address,address,uint256)'](addr1.address, addr2.address, 1))
      .to.emit(biteByViper, "Transfer")
      .withArgs(addr1.address, addr2.address, combinedTokenId);

    // still owner
    const ownerOfTokenId1AfterTransfer = await viper.ownerOf(1);
    expect(ownerOfTokenId1AfterTransfer).to.equal(addr1.address);

    await expect(viper.connect(addr2)['safeTransferFrom(address,address,uint256)'](addr2.address, addr1.address, 1))
      .to.be.revertedWith("NOT OWNER");
  })


  it("allows for tokens to be queried by owner no matter the order of minting by 1", async function () {
    const signers = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    let counts = []
    for (let i = 0; i < maxSupply; i++) {
      const signer = signers[i % signers.length]
      await viper.connect(signer)['mint()']({ value: correctPrice });
      counts[i % signers.length] = counts[i % signers.length] ? counts[i % signers.length] + 1 : 1
    }
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i]
      const tokens = await viper.tokensOfOwner(signer.address)
      expect(tokens.length).to.equal(counts[i])
    }
  })

  it("allows for tokens to be queried by owner no matter the order of minting by 3", async function () {
    const signers = await ethers.getSigners();
    const { viper } = await deployContracts();
    await viper.setPause(false)
    await viper.setStartdate(0)
    let counts = []
    for (let i = 0; i < (maxSupply / 3); i++) {
      const signer = signers[i % signers.length]
      await viper.connect(signer)['mint(uint256)'](3, { value: correctPrice.mul(3) });
      counts[i % signers.length] = counts[i % signers.length] ? counts[i % signers.length] + 3 : 3
    }
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i]
      const tokens = await viper.tokensOfOwner(signer.address)
      expect(tokens.length).to.equal(counts[i])
    }
  })

});
