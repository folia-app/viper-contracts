const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { deployContracts } = require("../scripts/utils.js");

async function throwError(err) {
  return new Promise((resolve, reject) => {
    reject(err);
  })
}

describe("Metadata Tests", function () {
  this.timeout(50000000);

  it("Confirm tokenURI returns combined baseURI and tokenId", async function () {
    const { viper, metadata } = await deployContracts();
    const tokenIds = [1, 100, 1010]
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i]
      const baseURI = await metadata.baseURI();
      const expectedURI = baseURI + tokenId.toString()
      const tokenURI = await viper.tokenURI(tokenId);
      expect(expectedURI).to.equal(tokenURI);
    }
  });


})