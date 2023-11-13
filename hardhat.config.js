require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");


//require("@nomiclabs/hardhat-ganache");

//https://www.npmjs.com/package/@eth-optimism/plugins/v/0.0.16

// require("@eth-optimism/plugins/hardhat/compiler")
// require('@eth-optimism/plugins/hardhat/ethers');
//https://github.com/scaffold-eth/scaffold-eth/blob/local-optimism/packages/hardhat/hardhat.config.js

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      gasPrice: 10_000_000_000,
      blockGasLimit: 30_000_000,
      chainId: 12345,
      // loggingEnabled: true
      // blockGasLimit: 199_517_929,
      // arbitrum : 199_517_929
      // optimism:   15_000_000
      // gasPrice: 20_000_000_000
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: { mnemonic: "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" }
    },
    optimistic: {
      url: "http://127.0.0.1:8545",
      accounts: { mnemonic: "test test test test test test test test test test test junk" },
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY,
      accounts: { mnemonic: process.env.deploymentKey },
    },
    kovan: {
      url: 'https://kovan.infura.io/v3/' + process.env.INFURA_API_KEY,
      accounts: { mnemonic: process.env.deploymentKey },
      gas: 5000000,
    },
    optimismkovan: {
      url: "https://kovan.optimism.io",
      accounts: { mnemonic: process.env.deploymentKey },
    },
    optimismgoerli: {
      url: "https://opt-goerli.g.alchemy.com/v2/AABlV686HfIY7zb97aYZCx9uUDCb2m_R",
      accounts: { mnemonic: process.env.deploymentKey },
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/' + process.env.INFURA_API_KEY,
      accounts: { mnemonic: process.env.deploymentKey },
      gasPrice: 10_000_000_000, // 10 GWEI
    },
    sepolia: {
      url: 'https://sepolia.infura.io/v3/' + process.env.INFURA_API_KEY,
      accounts: { mnemonic: process.env.deploymentKey },
      gasPrice: 15_000_000_000, // 15 GWEI
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY,
      accounts: { mnemonic: process.env.deploymentKey },
      gasPrice: 50_000_000_000,
    },
  },
  gasReporter: {
    currency: "EUR",
    gasPrice: 42,
    url: "http://localhost:8545",
    coinmarketcap: "38b60711-0559-45f4-8bda-e72f446c8278",
    enabled: true,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.etherscanApiNew,

    customChains: [
      {
        network: "optimismgoerli",
        chainId: 420,
        urls: {
          apiURL: "https://blockscout.com/optimism/goerli/api",
          browserURL: "https://blockscout.com/optimism/goerli",
        },
      },
      // {
      //   network: "goerli",
      //   chainId: 5,
      //   urls: {
      //     apiURL: "https://api-goerli.etherscan.io/",
      //     browserURL: "https://goerli.etherscan.io/",
      //   },
      // },
    ],
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: true,
    runOnCompile: true,
    strict: true,
  },
  // solidity: {
  //   version: "0.8.12",
  //   settings: {
  //     optimizer: {
  //       viaIR: true,
  //       enabled: false,
  //       runs: 100,
  //     },
  //   },
  // },
  solidity: {
    compilers: [
      {
        version: "0.8.15",
        settings: {
          viaIR: false,
          optimizer: { enabled: true, runs: 200 },
        },
      },
    ],
  },
};

//version: "0.8.4",
