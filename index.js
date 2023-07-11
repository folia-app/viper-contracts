
const ViperABI = require("./ContractsAddress/ABI-homestead-Viper.json");
const Viper = require("./ContractsAddress/homestead-Viper.json");
const ViperSepolia = require("./ContractsAddress/sepolia-Viper.json");

const MetadataABI = require("./ContractsAddress/ABI-homestead-Metadata.json");
const Metadata = require("./ContractsAddress/homestead-Metadata.json");
const MetadataSepolia = require("./ContractsAddress/sepolia-Metadata.json");

const BiteByViperABI = require("./ContractsAddress/ABI-homestead-BiteByViper.json");
const BiteByViper = require("./ContractsAddress/homestead-BiteByViper.json");
const BiteByViperSepolia = require("./ContractsAddress/sepolia-BiteByViper.json");

const { merkleAddresses } = require("./merkleAddresses.js");

module.exports = {
  merkleAddresses,
  Viper: {
    abi: ViperABI.abi,
    networks: {
      '1': Viper,
      'homestead': Viper,
      'mainnet': Viper,
      '11155111': ViperSepolia,
      'sepolia': ViperSepolia,
    },
  },
  Metadata: {
    abi: MetadataABI.abi,
    networks: {
      '1': Metadata,
      'homestead': Metadata,
      'mainnet': Metadata,
      '11155111': MetadataSepolia,
      'sepolia': MetadataSepolia,
    },
  },
  BiteByViper: {
    abi: BiteByViperABI.abi,
    networks: {
      '1': BiteByViper,
      'homestead': BiteByViper,
      'mainnet': BiteByViper,
      '11155111': BiteByViperSepolia,
      'sepolia': BiteByViperSepolia,
    },
  },
}