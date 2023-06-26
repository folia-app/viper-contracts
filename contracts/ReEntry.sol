//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Controller.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ReEntry is IERC721Receiver {
  address public controllerAddress;
  bool public reEntering = false;

  event MsgValue(uint256 msgValue);

  constructor(address controllerAddress_) {
    controllerAddress = controllerAddress_;
  }

  function reenter() internal {
    emit MsgValue(msg.value);
    if (!reEntering) {
      reEntering = true;
      Controller(controllerAddress).mint{value: msg.value}();
    }
  }

  function mint() external payable {
    emit MsgValue(msg.value);
    Controller(controllerAddress).mint{value: msg.value}();
  }

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes calldata data
  ) external returns (bytes4) {
    reenter();
    return this.onERC721Received.selector;
  }
}
