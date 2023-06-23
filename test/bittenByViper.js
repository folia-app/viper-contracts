const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice } = require("../scripts/utils.js");

describe("BittenByViper Tests", function () {
  this.timeout(50000000);

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
      const combinedtokenId = await bittenByViper.getCombinedTokenId(owner.address, tokenId, length);
      const returnedTokenId = await bittenByViper.extractTokenId(combinedtokenId);
      const returnedAddress = await bittenByViper.extractAddress(combinedtokenId);
      const returnedLength = await bittenByViper.extractLength(combinedtokenId);

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
})