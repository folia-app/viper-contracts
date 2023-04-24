const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { testJson, deployContracts, decodeUri, correctPrice, maxSupply, writeMetadata } = require("../scripts/utils.js");
const { optimize } = require("svgo");
const isSvg = require("is-svg");

const viperData = require("../data/data.json");

async function throwError(err) {
  return new Promise((resolve, reject) => {
    reject(err);
  })
}

describe("Controller Tests", function () {
  this.timeout(50000000);

  it("doesn't upload the same data twice", async () => {
    const [owner] = await hre.ethers.getSigners();
    const { metadata, controller } = await deployContracts();

    await writeMetadata(metadata, 15)

    let errors = await writeMetadata(metadata, 30)

    // expect errors to be an array of length 1
    expect(errors.length).to.equal(1);

    for (let i = 0; i < errors.length; i++) {
      await expect(throwError(errors[i])).to.be.revertedWith("ALREADY ADDED THIS CHUNK");
    }

    errors = await writeMetadata(metadata, 50)
    expect(errors.length).to.equal(2);

    const totalUploaded = await metadata.totalVipers()
    expect(totalUploaded).to.equal(50);


  })

  it("matches metadata between what's in JSON and what's on chain", async () => {
    const [owner] = await hre.ethers.getSigners();
    const { metadata, controller } = await deployContracts(false);

    // loop through viperData
    for (let i = 0; i < viperData.length; i++) {

      await controller.adminMint(owner.address)
      const c = viperData[i];

      // check metadata
      const svg = decodeUri(await metadata.getSVG(c.id));
      const originalSVG = fs.readFileSync(`./data/svg/${c.id}.svg`, "utf8");

      const optimizedSVGResult = optimize(svg);
      const optimizedOriginalSVGResult = optimize(originalSVG);

      if (optimizedOriginalSVGResult.data != optimizedSVGResult.data) {
        console.log({ svg });
        console.log({ originalSVG });
      }

      expect(optimizedSVGResult.data).to.equal(optimizedOriginalSVGResult.data);
    }

    await controller.setPause(false);
    // fail when one more is minted
    await expect(controller.mint({ value: correctPrice })).to.be.revertedWith("MAX SUPPLY REACHED");
  });


  it("validate Json Metadata", async function () {
    const [owner] = await ethers.getSigners();
    const { viper, controller, metadata } = await deployContracts(1);
    await controller.mint({ value: correctPrice });
    const tokenURI = await viper.tokenURI(1);
    const decoded = decodeUri(tokenURI)
    expect(testJson(decoded)).to.equal(true);
  });

  it("Validate Svg from Metadata", async function () {
    const { viper, controller } = await deployContracts(1);
    await controller.mint({ value: correctPrice });

    const tokenURI = await viper.tokenURI(1);
    const metaWithoutDataURL = decodeUri(tokenURI);
    const obj1 = JSON.parse(metaWithoutDataURL);
    const svg1 = obj1["image"];
    expect(isSvg(decodeUri(svg1))).to.equal(true);
  });

  it("Validate Svg Board", async function () {
    const { controller, metadata } = await deployContracts(1);
    await controller.mint({ value: correctPrice });
    const svg1 = await metadata.getSVG(1);
    expect(isSvg(decodeUri(svg1))).to.equal(true);
  });

  it("Validate viper values", async function () {
    const [owner, splitter, foo] = await ethers.getSigners();
    const { viper, controller, metadata } = await deployContracts(1);
    controller.connect(foo)
    await controller.mint({ value: correctPrice });
    const tokenURI = await viper.tokenURI(1);
    const metaWithoutDataURL = decodeUri(tokenURI);
    const obj1 = JSON.parse(metaWithoutDataURL);
    const attributesTest = [
      { trait_type: "Region", value: "Intra - Europe" },
      { trait_type: "Length", value: "237km" }
    ];
    expect(JSON.stringify(obj1["attributes"])).to.equal(JSON.stringify(attributesTest));
  });


})