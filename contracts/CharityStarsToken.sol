// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract CharityStarsToken is Ownable, AccessControlEnumerable, ERC721Enumerable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    struct Category {
        bytes32 hash;
        string name;
        bool visible;
    }

    struct Token {
        Category category;
        string title;
        string description;
        string cid;
    }

    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    EnumerableSet.AddressSet private _enabledCreators;

    EnumerableSet.Bytes32Set private _categorySet;
    mapping(bytes32 => Category) private _categories;

    mapping(uint256 => Token) private _tokens;

    string private _baseTokenURI;

    uint256 private _currentTokenId = 0;

    event CreatorEnabled(address indexed creator);
    event CreatorDisabled(address indexed creator);

    constructor() ERC721("CharityStars Token", "CST") {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(CREATOR_ROLE, _msgSender());
    }

    function creatorEnabled(address creator) public view returns (bool) {
        return hasRole(CREATOR_ROLE, creator);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerable, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function categories() external view returns (Category[] memory results) {
        results = new Category[](_categorySet.length());
        for (uint256 i = 0; i < _categorySet.length(); i++) {
            results[i] = _categories[_categorySet.at(i)];
        }
    }

    function getToken(uint256 tokenId) external view returns (Token memory token) {
        return _tokens[tokenId];
    }

    function createToken(
        string calldata title,
        string calldata description,
        string calldata cid,
        bytes32 categoryHash
    ) external onlyRole(CREATOR_ROLE) {
        require(_categorySet.contains(categoryHash), "Category doesn't exist");

        Token memory token = Token({
            category: _categories[categoryHash],
            title: title,
            description: description,
            cid: cid
        });

        uint256 tokenId = _generateTokenId();

        _mint(_msgSender(), tokenId);

        _tokens[tokenId] = token;
    }

    function burn(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(tokenId);
    }

    function addCategory(string calldata newCategory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(newCategory).length > 0, "newCategory is required");

        bytes32 categoryHash = keccak256(abi.encodePacked(newCategory));
        require(!_categorySet.contains(categoryHash), "Category already exists");

        Category memory category = Category({hash: categoryHash, name: newCategory, visible: true});

        _categories[categoryHash] = category;
        _categorySet.add(categoryHash);
    }

    function setCategoryVisibility(bytes32 categoryHash, bool visibility) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_categorySet.contains(categoryHash), "Category doesn't exist");

        _categories[categoryHash].visible = visibility;
    }

    function setBaseURI(string calldata newBaseTokenURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBaseTokenURI;
    }

    function _generateTokenId() internal returns (uint256) {
        return ++_currentTokenId;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
}
