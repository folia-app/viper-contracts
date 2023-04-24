// import { builtinModules } from "node:module";

const hre = require("hardhat");
const path = require("node:path");
const fs = require("fs").promises;

const correctPrice = ethers.utils.parseEther("0.111111111111111111");
const maxSupply = 545;

const testJson = (tJson) => {
  try {
    JSON.parse(tJson);
  } catch (e) {
    return false;
  }
  return true;
};

const getPathABI = async (name) => {
  var networkinfo = await hre.ethers.provider.getNetwork();
  var savePath = path.join(
    __dirname,
    "..",
    "ContractsAddress",
    "ABI-" + String(networkinfo["name"]) + "-" + String(name) + ".json"
  );
  return savePath;
};

async function readData(path) {
  try {
    const Newdata = await fs.readFile(path, "utf8");
    return Newdata;
  } catch (e) {
    console.log("e", e);
  }
}

const getPathAddress = async (name) => {
  var networkinfo = await hre.ethers.provider.getNetwork();
  var savePath = path.join(
    __dirname,
    "..",
    "ContractsAddress",
    String(networkinfo["name"]) + "-" + String(name) + ".json"
  );
  return savePath;
};

const initContracts = async () => {
  const [owner] = await hre.ethers.getSigners();

  const addressViper = JSON.parse(await readData(await getPathAddress("Viper")))["address"];
  const ABIViper = JSON.parse(await readData(await getPathABI("Viper")))["abi"];
  let viper = new ethers.Contract(addressViper, ABIViper, owner);

  const addressController = JSON.parse(await readData(await getPathAddress("Controller")))[
    "address"
  ];
  const ABIController = JSON.parse(await readData(await getPathABI("Controller")))["abi"];
  let controller = new ethers.Contract(addressController, ABIController, owner);

  let metadata = await initMetadata()

  return { viper, controller, metadata };
};

const initMetadata = async () => {
  const [owner] = await hre.ethers.getSigners();
  const addressMetadata = JSON.parse(await readData(await getPathAddress("Metadata")))["address"];
  const ABIMetadata = JSON.parse(await readData(await getPathABI("Metadata")))["abi"];
  let metadata = new ethers.Contract(addressMetadata, ABIMetadata, owner);
  return metadata
}

const decodeUri = (decodedJson) => {
  const metaWithoutDataURL = decodedJson.substring(decodedJson.indexOf(",") + 1);
  let buff = Buffer.from(metaWithoutDataURL, "base64");
  let text = buff.toString("ascii");
  return text;
};




const deployContracts = async (skipMetadata = true) => {
  var networkinfo = await hre.ethers.provider.getNetwork();
  const blocksToWaitBeforeVerify = 0;

  var metadataCount = 0
  if (typeof skipMetadata !== "boolean") {
    metadataCount = skipMetadata
  } else if (!skipMetadata) {
    metadataCount = maxSupply
  }
  console.log("Start Deployment:");
  const [owner, splitter] = await hre.ethers.getSigners();
  // deploy Controller
  const Controller = await hre.ethers.getContractFactory("Controller");
  const controller = await Controller.deploy(splitter.address, networkinfo["chainId"] == 1 ? { nonce: 453 } : {});
  await controller.deployed();
  var controllerAddress = controller.address;
  console.log("Controller Deployed at " + String(controllerAddress) + ` with splitter ${splitter.address}`);



  // deploy Metadata
  const Metadata = await hre.ethers.getContractFactory("Metadata");
  const metadata = await Metadata.deploy();
  await metadata.deployed();
  var metadataAddress = metadata.address;
  console.log("Metadata Deployed at " + String(metadataAddress));


  if (metadataCount > 0) {
    await writeMetadata(metadata, metadataCount);
  }

  // deploy Viper
  const Viper = await ethers.getContractFactory("Viper");
  const viper = await Viper.deploy(controllerAddress, metadataAddress);
  await viper.deployed();
  var viperAddress = viper.address;
  console.log("Viper Deployed at " + String(viperAddress) + ` with controller ${controllerAddress} and metadata ${metadataAddress}`);

  // configure Controller
  await controller.setViper(viperAddress);
  console.log(`Controller configured with viper ${viperAddress}`)

  // configure Metadata
  await metadata.setViper(viperAddress);
  console.log(`Metadata configured with viper ${viperAddress}`)


  // verify contract if network ID is goerli
  if (networkinfo["chainId"] == 5 || networkinfo["chainId"] == 1) {
    if (blocksToWaitBeforeVerify > 0) {
      console.log(`Waiting for ${blocksToWaitBeforeVerify} blocks before verifying`)
      await controller.deployTransaction.wait(blocksToWaitBeforeVerify);
    }

    try {
      console.log("Verifying Controller Contract");
      await hre.run("verify:verify", {
        address: controllerAddress,
        constructorArguments: [splitter.address],
      });
    } catch (e) {
      console.log({ e })
    }

    // console.log(`Waiting for ${blocksToWaitBeforeVerify} blocks before verifying`)
    await controller.deployTransaction.wait(blocksToWaitBeforeVerify);

    console.log("Verifying Metadata Contract");
    try {
      await hre.run("verify:verify", {
        address: metadataAddress,
        constructorArguments: [],
      });
    } catch (e) {
      console.log({ e })
    }

    // console.log(`Waiting for ${blocksToWaitBeforeVerify} blocks before verifying`)
    await controller.deployTransaction.wait(blocksToWaitBeforeVerify);
    console.log("Verifying Viper Contract");
    try {
      await hre.run("verify:verify", {
        address: viperAddress,
        constructorArguments: [controllerAddress, metadataAddress],
      });
    } catch (e) {
      console.log({ e })
    }

  }

  return { viper, controller, metadata };
};

const writeMetadata = async (metadata, count) => {
  if (!metadata) {
    console.log("No metadata contract found. Initializing...")
    metadata = await initMetadata()
  }
};

module.exports = {
  decodeUri,
  initContracts,
  deployContracts,
  getathABI,
  getPathAddress,
  readData,
  testJson,
  correctPrice,
  maxSupply,
  writeMetadata
};
