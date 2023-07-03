
const ViperABI = require("./ContractsAddress/ABI-sepolia-Viper.json");
const ViperSepolia = require("./ContractsAddress/sepolia-Viper.json");

const MetadataABI = require("./ContractsAddress/ABI-sepolia-Metadata.json");
const MetadataSepolia = require("./ContractsAddress/sepolia-Metadata.json");

const BiteByViperABI = require("./ContractsAddress/ABI-sepolia-BiteByViper.json");
const BiteByViperSepolia = require("./ContractsAddress/sepolia-BiteByViper.json");

const { merkleAddresses } = require("./merkleAddresses.js");

module.exports = {
  merkleAddresses,
  Viper: {
    abi: ViperABI.abi,
    networks: {
      '11155111': ViperSepolia,
      'sepolia': ViperSepolia
    },
  },
  Metadata: {
    abi: MetadataABI.abi,
    networks: {
      '11155111': MetadataSepolia,
      'sepolia': MetadataSepolia
    },
  },
  BiteByViper: {
    abi: BiteByViperABI.abi,
    networks: {
      '11155111': BiteByViperSepolia,
      'sepolia': BiteByViperSepolia
    },
  },
}