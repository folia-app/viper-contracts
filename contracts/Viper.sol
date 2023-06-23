//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Metadata.sol";
import "./Controller.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/*

----------------------------------------------------------------------------------------------------


----------------------------------------------------------------------------------------------------
  
      
By @0xJ3lly
Presented by Folia.app
                                    
*/

/// @title Viper
/// @notice https://viper.folia.app
/// @author @0xJ3lly
/// @dev standard 721 token and permissions for Minting and Metadata as controlled by external contracts

contract Viper is ERC721Enumerable, Ownable, ERC2981 {
  address public controller;
  address public metadata;
  uint256 public constant MAX_SUPPLY = 468;
  uint256[MAX_SUPPLY] public lengths;

  constructor(address controller_, address metadata_) ERC721("Viper", "VPR") {
    controller = controller_;
    metadata = metadata_;
    _setDefaultRoyalty(Controller(controller).splitter(), 1000); // 10%
  }

  // @dev overwrites the transferFrom function from ERC721
  // @param from the address of the sender
  // @param to the address of the recipient
  // @param tokenId the id of the NFT
  function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) {
    address currentOwner = ownerOf(tokenId);
    // if this is a transfer directly from the owner, interpret it as a event
    if (msg.sender == currentOwner) {
      uint256 length = lengths[tokenId - 1];
      Controller(controller).poison(from, to, tokenId, length + 1); // initial length stored as 0, so add 1
      lengths[tokenId - 1] = length + 1; // add 1 segment to the viper every time it bites
    } else {
      // else if this is a mediated transfer, like from a marketplace, interpret it as a real transfer
      super.transferFrom(from, to, tokenId);
    }
  }

  /// @dev overwrites the tokenURI function from ERC721
  /// @param id the id of the NFT
  function tokenURI(uint256 id) public view override(ERC721) returns (string memory) {
    return Metadata(metadata).getMetadata(id);
  }

  /// @dev mint token
  /// @param recipient the recipient of the NFT
  function mint(address recipient) public {
    require(msg.sender == controller, "NOT CONTROLLER");
    uint256 tokenId = totalSupply() + 1;
    require(tokenId <= MAX_SUPPLY, "MAX SUPPLY REACHED");
    _safeMint(recipient, tokenId);
  }

  function setController(address controller_) public onlyOwner {
    controller = controller_;
  }

  function setMetadata(address metadata_) public onlyOwner {
    metadata = metadata_;
  }

  function setRoyaltyPercentage(address royaltyReceiver, uint96 royaltyPercentage) public onlyOwner {
    _setDefaultRoyalty(royaltyReceiver, royaltyPercentage);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC2981, ERC721Enumerable) returns (bool) {
    return
      interfaceId == type(IERC721).interfaceId ||
      interfaceId == type(IERC721Metadata).interfaceId ||
      interfaceId == type(IERC721Enumerable).interfaceId ||
      interfaceId == type(IERC2981).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
