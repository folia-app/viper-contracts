
const ViperABI = require("./ContractsAddress/ABI-sepolia-Viper.json");
const ViperSepolia = require("./ContractsAddress/Viper-Sepolia.json");

const ControllerABI = require("./ContractsAddress/ABI-sepolia-Controller.json");
const ControllerSepolia = require("./ContractsAddress/Controller-Sepolia.json");

const MetadataABI = require("./ContractsAddress/ABI-sepolia-Metadata.json");
const MetadataSepolia = require("./ContractsAddress/Metadata-Sepolia.json");

const BiteByViperABI = require("./ContractsAddress/ABI-sepolia-BiteByViper.json");
const BiteByViperSepolia = require("./ContractsAddress/BiteByViper-Sepolia.json");

module.exports = {
  Viper: {
    abi: ViperABI.abi,
    networks: {
      '11155111': ViperSepolia,
      'sepolia': ViperSepolia
    },
  },
  Controller: {
    abi: ControllerABI.abi,
    networks: {
      '11155111': ControllerSepolia,
      'sepolia': ControllerSepolia

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