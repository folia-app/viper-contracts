const { initContracts, correctPrice } = require("./utils");

// npx hardhat mint <number-of-vipers>

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const { viper } = await initContracts();
  const numberOfVipers = 21;
  // for (i = 0; i < numberOfVipers; i++) {
  // const value = "0"
  await viper.adminMint(owner.address, numberOfVipers, { nonce: 521 });
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
