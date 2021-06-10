// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../CharityStarsToken.sol";

contract CharityStarsTokenMock is CharityStarsToken {
    function mint(address to) public virtual {
        _mint(to, _generateTokenId());
    }
}
