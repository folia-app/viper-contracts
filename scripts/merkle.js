const { initContracts, merkleAddresses } = require("./utils");
const { ethers } = require('ethers')
const { MerkleTree } = require('merkletreejs')

// npx hardhat mint <number-of-vipers>

async function main() {
  const [owner, addr1] = await hre.ethers.getSigners();
  const billy = '0xFa398d672936Dcf428116F687244034961545D91'
  const { viper } = await initContracts();

  // const realTree = new MerkleTree(
  //   merkleAddresses.map(ethers.utils.keccak256),
  //   ethers.utils.keccak256,
  //   { sortPairs: true },
  // );
  // const realTreeRoot = "0x" + realTree.getRoot().toString('hex')

  const addresses = [owner.address, addr1.address, billy]
  console.log({ addresses })
  return
  const fakeTree = new MerkleTree(
    addresses.map(ethers.utils.keccak256),
    ethers.utils.keccak256,
    { sortPairs: true },
  );
  const fakeTreeRoot = "0x" + fakeTree.getRoot().toString('hex')


  await viper.setMerkleRoot(fakeTreeRoot)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




// it("contract contains correct merkle root", async function () {
//   const [owner, addr1] = await ethers.getSigners();
//   const { viper } = await deployContracts();
//   const tree = new MerkleTree(
//     merkleAddresses.map(ethers.utils.keccak256),
//     ethers.utils.keccak256,
//     { sortPairs: true },
//   );

//   const viperRoot = await viper.merkleRoot()
//   const treeRoot = "0x" + tree.getRoot().toString('hex')
//   expect(viperRoot).to.equal(treeRoot);
// })

// it("correctly mints using allowlist created for tests", async function () {
//   const [owner, addr1, addr2] = await ethers.getSigners();
//   const { viper } = await deployContracts();

//   const addresses = [owner.address, addr1.address]

//   const tree = new MerkleTree(
//     addresses.map(ethers.utils.keccak256),
//     ethers.utils.keccak256,
//     { sortPairs: true },
//   );

//   const newRoot = "0x" + tree.getRoot().toString('hex')
//   await viper.setMerkleRoot(newRoot)

//   const contractRoot = await viper.merkleRoot()
//   expect(contractRoot).to.equal(newRoot);

//   const hashedAddress = ethers.utils.keccak256(owner.address);
//   const hexProof = tree.getHexProof(hashedAddress);

//   await viper.setPrice(0)
//   await viper.setPause(false)
//   await viper.setPremint(0)

//   await expect(viper.mintAllowList(1, hexProof))
//     .to.emit(viper, "Transfer")

//   const balance = await viper.balanceOf(owner.address);
//   expect(balance).to.equal(1);

//   const failHashedAddress = ethers.utils.keccak256(addr2.address);
//   const failHexProof = tree.getHexProof(failHashedAddress);
//   await expect(viper.connect(addr2).mintAllowList(1, failHexProof))
//     .to.be.revertedWith("You are not on the allowlist");
// })