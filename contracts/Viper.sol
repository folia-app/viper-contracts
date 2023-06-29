//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Metadata.sol";
import "./BiteByViper.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "erc721a/contracts/extensions/ERC721AQueryable.sol";

/*

----------------------------------------------------------------------------------------------------


----------------------------------------------------------------------------------------------------
  
      
By @0xJ3lly
Presented by Folia.app
                                    
*/

/// @title Viper-사랑해
/// @notice https://viper.folia.app
/// @author @0xJ3lly
/// @dev standard 721 token and permissions for Minting and Metadata as controlled by external contracts

contract Viper is ERC721AQueryable, Ownable, ERC2981 {
  bool public paused = true;
  uint256 public constant MAX_SUPPLY = 486;
  uint256 public price = 0.055555555555555555 ether;
  address public biteByViper;
  address public metadata;
  address public splitter;
  uint256[MAX_SUPPLY] public lengths;

  event EthMoved(address indexed to, bool indexed success, bytes returnData, uint256 amount);

  constructor(address metadata_, address splitter_) ERC721A("VIPER", "VPR") {
    metadata = metadata_;
    splitter = splitter_; // splitter doesn't need to be checked because it's checked in _setDefaultRoyalty
    _setDefaultRoyalty(splitter, 1000); // 10%
  }

  // @dev Throws if called before the BiteuByViper address is set.
  modifier initialized() {
    require(biteByViper != address(0), "NO BITE BY VIPER ADDRESS");
    _;
  }

  function _startTokenId() internal view virtual override(ERC721A) returns (uint256) {
    return 1;
  }

  /// @dev overwrites the transferFrom function from ERC721
  /// @param to the address of the recipient
  /// @param tokenId the id of the NFT
  function transferFrom(address from, address to, uint256 tokenId) public payable override(ERC721A, IERC721A) {
    require(from == ownerOf(tokenId), "NOT OWNER");
    // if this is a transfer directly from the owner, interpret it as a poison event
    if (msg.sender == from) {
      poison(from, to, tokenId);
    } else {
      // else if this is a mediated transfer, like from a marketplace, interpret it as a real transfer
      super.transferFrom(from, to, tokenId);
    }
  }

  /// @dev direct access to the poison function, mostly used to check gas costs
  /// @param to the address of the recipient
  /// @param tokenId the id of the NFT
  function poison(address from, address to, uint256 tokenId) internal {
    require(balanceOf(to) == 0, "Can't poison someone who owns a Viper");
    require(to.balance != 0, "Can't poison an address with 0 balance");
    uint256 length = lengths[tokenId];
    uint256 lengthPlusOne = length + 1;
    BiteByViper(biteByViper).poison(from, to, tokenId, lengthPlusOne); // initial length stored as 0, so add 1
    lengths[tokenId] = lengthPlusOne; // add 1 segment to the viper every time it bites
  }

  /// @dev overwrites the tokenURI function from ERC721
  /// @param id the id of the NFT
  function tokenURI(uint256 id) public view override(ERC721A, IERC721A) returns (string memory) {
    return Metadata(metadata).getMetadata(id);
  }

  /// @dev mint token with default settings
  function mint() public payable {
    mint(msg.sender, 1);
  }

  /// @dev mint tokens with recipient as parameter
  /// @param recipient the recipient of tokens to mint
  function mint(address recipient) public payable {
    mint(recipient, 1);
  }

  /// @dev mint tokens with quantity as parameter
  /// @param quantity the quantity of tokens to mint
  function mint(uint256 quantity) public payable {
    mint(msg.sender, quantity);
  }

  /// @dev mint tokens with rcipient and quantity as parameters
  /// @param recipient the recipient of the NFT
  /// @param quantity the quantity of tokens to mint
  function mint(address recipient, uint256 quantity) public payable initialized {
    require(!paused, "PAUSED");
    require(msg.value >= price * quantity, "WRONG PRICE");
    require(quantity == 1 || quantity == 3 || quantity == 5, "CAN'T MINT BESIDES QUANTITY OF 1, 3 OR 5");
    if (totalSupply() + quantity > MAX_SUPPLY) {
      revert("MAX SUPPLY REACHED");
    }
    (bool sent, bytes memory data) = splitter.call{value: msg.value}("");
    emit EthMoved(splitter, sent, data, msg.value);
    _safeMint(recipient, quantity);
  }

  /// @dev only the owner can mint without paying
  /// @param recipient the recipient of the NFT
  /// @param quantity the quantity of tokens to mint
  function adminMint(address recipient, uint256 quantity) public initialized onlyOwner {
    _safeMint(recipient, quantity);
  }

  /// @dev set the BiteByViper address as called by the owner
  /// @param biteByViper_ the address of the viper contract
  function setBiteByViper(address biteByViper_) public onlyOwner {
    require(biteByViper_ != address(0), "NO ZERO ADDRESS");
    biteByViper = biteByViper_;
  }

  /// @dev set the metadata address as called by the owner
  /// @param metadata_ the address of the metadata contract
  function setMetadata(address metadata_) public onlyOwner {
    metadata = metadata_;
  }

  /// @dev only the owner can set the splitter address
  /// @param splitter_ the address of the splitter
  function setSplitter(address splitter_) public onlyOwner {
    require(splitter_ != address(0), "NO ZERO ADDRESS");
    splitter = splitter_;
  }

  function setPrice(uint256 price_) public onlyOwner {
    price = price_;
  }

  /// @dev only the owner can set the contract paused
  function setPause(bool paused_) public onlyOwner {
    paused = paused_;
  }

  /// @dev set the royalty percentage as called by the owner
  /// @param royaltyReceiver the address of the royalty receiver
  /// @param royaltyPercentage the percentage of the royalty
  function setRoyaltyPercentage(address royaltyReceiver, uint96 royaltyPercentage) public onlyOwner {
    _setDefaultRoyalty(royaltyReceiver, royaltyPercentage);
  }

  /// @dev if mint fails to send eth to splitter, admin can recover
  // This should not be necessary but Berlin hardfork broke split before so this
  // is extra precaution. Also allows recovery if users accidentally send eth
  // straight to the contract.
  function recoverUnsuccessfulMintPayment(address payable _to) public onlyOwner {
    uint256 amount = address(this).balance;
    (bool sent, bytes memory data) = _to.call{value: amount}("");
    emit EthMoved(_to, sent, data, amount);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  /// @dev set the royalty percentage as called by the owner
  /// @param interfaceId the interface id
  /// @return bool whether the interface is supported
  /// @notice ERC2981, ERC721A, ERC2981, IERC721A are overridden to support multiple interfaces
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC2981, ERC721A, IERC721A) returns (bool) {
    return
      interfaceId == type(IERC721).interfaceId ||
      interfaceId == type(IERC721Metadata).interfaceId ||
      interfaceId == type(IERC2981).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
