// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

struct NFT {
    uint tokenId;
    address tokenAddr;
    string name;
    string symbol;
    string tokenmetaURI;
}

contract ERC721BALANCEAGGREGATOR{
    // Addresses of whitelisted ERC721 tokens on evmos chain

    address[] public addr = [0x4C275aDE386Af17276834579b1A68146cef3C770,
                0xCcE4071459C70465428e1F03D0f381b4f4EA04AF,
                0x2BcB6bE17F975423AF354d5F878C2D7c94e17C42,
                0x6D58cbB9104Be5666E856983EaB1cf8b0237c75e,
                0xA5c9cb9a6d1A6AddEd8060B58a3F8386938104DA,
                0xd72Ef54Da083C7610BC517a9091Bd85cBd98694D,
                0x5E19a7606f91283038Bb4EA4B2afed2C98cdb0A2,
                0xb19da44293147AD2dd0Ea3Ded47949d2971A3818,
                0xc9a295Cd47C2812d1492919e9140863aB4A1bCB5,
                0x03F4EE9Eac9c86aC001824166c6D269abaC1F83d,
                0x137b4f8EC6f49A831c43cd306c12C08412d039F2,
                0x31782794fd38803E16bc4D7C504CF31E8E6DD282,
                0x9C0023F5317a70dE48716a488ffc59ee0C6C7d1b,
                0xCaa087e6531fb9AAae423E439DA522cCD8D57B97,
                0xF2E8a8509AB69aF07c7b3636a1dB8d2B600e0572];

    address private creator;
    constructor ()  {
       creator = msg.sender;
   }

    function getTokens(address _owner, address tok) public view returns (NFT[] memory) {      
        uint size = ERC721(tok).balanceOf(_owner);
        NFT[] memory _tokensOfOwner = new NFT[](size);
        for (uint i=0;i < ERC721(tok).balanceOf(_owner);i++){
            NFT memory temp;
            uint tokenId = ERC721Enumerable(tok).tokenOfOwnerByIndex(_owner, i);
            temp = NFT(tokenId,tok,IERC721Metadata(tok).name(),IERC721Metadata(tok).symbol(),IERC721Metadata(tok).tokenURI(tokenId));
            _tokensOfOwner[i] = temp;
        }
        return (_tokensOfOwner);
    }
    function addToken(address newAdd) public returns(address[] memory) {
        require(msg.sender == creator, 'UnAuthorized');
        addr.push(newAdd);
        return addr;
    }

    function removeToken(address newAdd) public returns(uint) {
        require(msg.sender == creator, 'UnAuthorized');
        uint size = addr.length;
        for(uint i=0;i < size;i++){
            if(addr[i] == newAdd){
                for(uint j=i;j < size - 1 ; j++){
                    addr[j] = addr[j+1];
                }
                addr.pop();
                return 1;
            }
        }
        return 0;
    }


    function getgivennfts(address _owner, address[] calldata gaddr ) public view returns (NFT[] memory){
        uint size = gaddr.length;
        uint tsize = 0;
        uint[] memory sizes = new uint[](size);
        for(uint i =0; i< size;i++){
            sizes[i] = ERC721(gaddr[i]).balanceOf(_owner);
            tsize += sizes[i];
        }
        NFT[] memory allNft = new NFT[](tsize);
        uint k = 0;
        for(uint i = 0; i < size;i++){
            NFT[] memory temp = getTokens(_owner,gaddr[i]);
            for(uint j = 0; j< sizes[i];j++){
                allNft[k] = temp[j];
                k+=1;
            }
        }
        return allNft;
    }
    
    function getnfts(address _owner) public view returns (NFT[] memory){
        uint size = addr.length;
        uint tsize = 0;
        uint[] memory sizes = new uint[](size);
        for(uint i =0; i< size;i++){
            sizes[i] = ERC721(addr[i]).balanceOf(_owner);
            tsize += sizes[i];
        }
        NFT[] memory allNft = new NFT[](tsize);
        uint k = 0;
        for(uint i = 0; i < size;i++){
            NFT[] memory temp = getTokens(_owner,addr[i]);
            for(uint j = 0; j< sizes[i];j++){
                allNft[k] = temp[j];
                k+=1;
            }
        }
        return allNft;
    }
}