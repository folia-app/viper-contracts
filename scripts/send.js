async function main() {
  // const networkId = await hre.ethers.provider.getNetwork();
  // console.log({ networkId })
  const [owner] = await hre.ethers.getSigners();
  const tx = await owner.sendTransaction({
    to: "0xFa398d672936Dcf428116F687244034961545D91",
    value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
  });
  console.log("Transaction:", tx);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
