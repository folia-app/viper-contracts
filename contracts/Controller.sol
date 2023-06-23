//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./BittenByViper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface iNFT {
  function mint(address recipient) external;

  function balanceOf(address owner) external view returns (uint256 balance);
}

/// @title Viper Controller
/// @notice https://viper.folia.app
/// @author @0xJ3lly
/// @dev managing the mint and payments

contract Controller is Ownable {
  bool public paused;
  address public nft;
  address public splitter;
  address public bittenByViper;
  uint256 public price = 0.111111111111111111 ether;

  event EthMoved(address indexed to, bool indexed success, bytes returnData);

  constructor(address payable splitter_) {
    splitter = splitter_;
  }

  // @dev Throws if called before the NFT address is set.
  modifier initialized() {
    require(nft != address(0), "NO NFT");
    require(splitter != address(0), "NO SPLIT");
    require(bittenByViper != address(0), "NO BITTEN");
    _;
  }

  function poison(address from, address to, uint256 tokenId, uint256 length) public initialized {
    require(msg.sender == nft, "Only Viper can call poison");
    require(iNFT(nft).balanceOf(to) == 0, "Can't poison someone who owns a Viper");
    require(to.balance != 0, "Can't poison an address with 0 balance"); // TODO: decide whether to keep this
    BittenByViper(bittenByViper).poison(from, to, tokenId, length);
  }

  /// @dev mints NFTs
  function mint() public payable initialized {
    require(!paused, "PAUSED");
    require(msg.value == price, "WRONG PRICE");
    (bool sent, bytes memory data) = splitter.call{value: msg.value}("");
    emit EthMoved(msg.sender, sent, data);
    iNFT(nft).mint(msg.sender);
  }

  /// @dev only the owner can set the splitter address
  function setSplitter(address splitter_) public onlyOwner {
    splitter = splitter_;
  }

  /// @dev only the owner can set the bittenByViper address
  function setBittenByViper(address bittenByViper_) public onlyOwner {
    bittenByViper = bittenByViper_;
  }

  /// @dev only the owner can set the nft address
  function setNFT(address nft_) public onlyOwner {
    nft = nft_;
  }

  /// @dev only the owner can set the contract paused
  function setPause(bool paused_) public onlyOwner {
    paused = paused_;
  }

  function setPrice(uint256 price_) public onlyOwner {
    price = price_;
  }

  /// @dev only the owner can mint without paying
  function adminMint(address recipient) public initialized onlyOwner {
    iNFT(nft).mint(recipient);
  }

  /// @dev if mint fails to send eth to splitter, admin can recover
  // This should not be necessary but Berlin hardfork broke split before so this
  // is extra precaution. Also allows recovery if users accidentally send eth
  // straight to the contract.
  function recoverUnsuccessfulMintPayment(address payable _to) public onlyOwner {
    (bool sent, bytes memory data) = _to.call{value: address(this).balance}("");
    emit EthMoved(_to, sent, data);
  }
}
