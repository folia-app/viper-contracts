const hre = require("hardhat");

async function main() {
  var a = await hre.ethers.provider.getBlock();
  console.log(a);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
