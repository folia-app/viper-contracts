//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// import "base64-sol/base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/utils/Strings.sol";
import "./Viper.sol";

/// @title Viper Metadata
/// @notice https://viper.folia.app
/// @author @0xJ3lly
/// @dev Generates the metadata as JSON String and encodes it with base64 and data:application/json;base64,

contract Metadata is Ownable {
  constructor() {}

  /**
   * @dev Throws if id doesn't exist
   */
  modifier existsModifier(uint256 id) {
    require(exists(id), "DOES NOT EXIST");
    _;
  }

  function exists(uint256 id) public view returns (bool) {
    return Viper(nFTAddress).ownerOf(id) != address(0);
  }

  address nFTAddress;

  function setNFTAddress(address nFTAddress) public onlyOwner {
    nFTAddress = nFTAddress_;
  }

  /// @dev generates the metadata
  /// @param tokenId the tokenId
  function getMetadata(uint256 tokenId) public view existsModifier(tokenId) returns (string memory) {}
}
