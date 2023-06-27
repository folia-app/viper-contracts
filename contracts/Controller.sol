//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./BiteByViper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface iNFT {
  function controllerMint(address recipient, uint256 quantity) external;

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
  address public biteByViper;
  uint256 public price = 0.055555555555555555 ether;

  event EthMoved(address indexed to, bool indexed success, bytes returnData, uint256 amount);

  constructor(address payable splitter_) {
    paused = true;
    splitter = splitter_;
  }

  // @dev Throws if called before the NFT address is set.
  modifier initialized() {
    require(nft != address(0), "NO NFT");
    require(splitter != address(0), "NO SPLIT");
    require(biteByViper != address(0), "NO BITTEN");
    _;
  }

  function poison(address from, address to, uint256 tokenId, uint256 length) public initialized {
    require(msg.sender == nft, "Only Viper can call poison");
    require(iNFT(nft).balanceOf(to) == 0, "Can't poison someone who owns a Viper");
    require(to.balance != 0, "Can't poison an address with 0 balance");
    BiteByViper(biteByViper).poison(from, to, tokenId, length);
  }

  /// @dev mints NFTs
  function mint() public payable {
    mint(msg.sender, 1);
  }

  function mint(uint256 quantity) public payable {
    mint(msg.sender, quantity);
  }

  function mint(address recipient) public payable {
    mint(recipient, 1);
  }

  function mint(address recipient, uint256 quantity) public payable initialized {
    require(!paused, "PAUSED");
    require(msg.value >= price * quantity, "WRONG PRICE");
    require(quantity == 1 || quantity == 3 || quantity == 5, "CAN'T MINT BESIDES QUANTITY OF 1, 3 OR 5");
    (bool sent, bytes memory data) = splitter.call{value: msg.value}("");
    emit EthMoved(splitter, sent, data, msg.value);
    iNFT(nft).controllerMint(recipient, quantity);
  }

  /// @dev only the owner can set the splitter address
  function setSplitter(address splitter_) public onlyOwner {
    splitter = splitter_;
  }

  /// @dev only the owner can set the biteByViper address
  function setBiteByViper(address biteByViper_) public onlyOwner {
    biteByViper = biteByViper_;
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
  function adminMint(address recipient, uint256 quantity) public initialized onlyOwner {
    iNFT(nft).controllerMint(recipient, quantity);
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
}
