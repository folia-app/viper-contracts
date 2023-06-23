//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// import "base64-sol/base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./Viper.sol";

/// @title Viper Metadata
/// @notice https://viper.folia.app
/// @author @0xJ3lly
/// @dev 

contract Metadata is Ownable {
  constructor() {}
  string public baseURI = "https://viper.folia.app/v1/metadata/";

  function setbaseURI(string memory baseURI_) public onlyOwner {
    baseURI = baseURI_;
  }

  /// @dev generates the metadata
  /// @param tokenId the tokenId
  function getMetadata(uint256 tokenId) public view returns (string memory) {
    return 
    string(
        abi.encodePacked(
          baseURI,
          Strings.toString(tokenId)
        )
    );
  }
}
