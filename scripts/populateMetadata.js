// to deploy local
//npx hardhat node
//npx hardhat run --network localhost scripts/deploy.js
const hre = require("hardhat");

const { writeMetadata, maxSupply } = require("./utils");

async function main() {
  const errors = await writeMetadata(null, maxSupply)
  if (errors.length > 0) {
    console.error(errors)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
