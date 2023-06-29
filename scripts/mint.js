const { initContracts, correctPrice } = require("./utils");

// npx hardhat mint <number-of-vipers>

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const { viper } = await initContracts();
  const numberOfVipers = 1;
  for (i = 0; i < numberOfVipers; i++) {
    await viper.adminMint(owner.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
