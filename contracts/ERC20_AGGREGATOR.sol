// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.11; 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20BALANCEAGGREGATOR{
    // Addresses of whitelisted ERC20 tokens on evmos chain
    address[] public addr = [0xD4949664cD82660AaE99bEdc034a0deA8A0bd517,0x3f75ceabCDfed1aCa03257Dc6Bdc0408E2b4b026,0x75aeE82a16BD1fB98b11879af93AB7CE055f66Da,0x63743ACF2c7cfee65A5E356A4C4A005b586fC7AA,0x5842C5532b61aCF3227679a8b1BD0242a41752f2,0xF80699Dc594e00aE7bA200c7533a07C1604A106D,0x51e44FfaD5C2B122C8b635671FCC8139dc636E82,0x7FF4a56B32ee13D7D4D405887E0eA37d61Ed919e,0x28eC4B29657959F4A5052B41079fe32919Ec3Bd3,0xd0ec216A38F199B0229AE668a96c3Cd9F9f118A6,0xE03494D0033687543a80c9B1ca7D6237F2EA8BD8,0xd8176865DD0D672c6Ab4A427572f80A72b4B4A9C,0x461d52769884ca6235B685EF2040F47d30C94EB5,0x7C598c96D02398d89FbCb9d41Eab3DF0C16F227D,0x332730a4F6E03D9C55829435f10360E13cfA41Ff,0x2C78f1b70Ccf63CDEe49F9233e9fAa99D43AA07e,0xC1Be9a4D5D45BeeACAE296a7BD5fADBfc14602C4,0x940dAAbA3F713abFabD79CdD991466fe698CBe54,0x153A59d48AcEAbedbDCf7a13F67Ae52b434B810B,0xb98e169C37ce30Dd47Fdad1f9726Fb832191e60b,0xe46910336479F254723710D57e7b683F3315b22B,0xb72A7567847abA28A2819B855D7fE679D4f59846,0x516e6D96896Aea92cE5e78B0348FD997F13802ad,0x75364D4F779d0Bd0facD9a218c67f87dD9Aff3b4,0x8006320739fC281da67Ee62eB9b4Ef8ADD5C903a,0x729416B1F442f204989f1C9f0d58321F878808eD,0x48421FF1c6B93988138130865C4B7Cce10358271,0xFe6998C5c22936CCa749b14Fcf5F190398cfa8F8,0xBbD37BF85f7474b5bDe689695674faB1888565Ad];
    uint public size = 29;

    address private creator;
    constructor ()  {
       creator = msg.sender;
   }

    function getBalanceOfToken(address userAddress, address _address) public view returns (uint) {
        return (ERC20(_address).balanceOf(userAddress));
    }

    function addToken(address newAdd) public returns(address[] memory) {
        require(msg.sender == creator, 'UnAuthorized');
        addr.push(newAdd);
        size += 1;
        return addr;
    }

    function removeToken(address newAdd) public returns(uint) {
        require(msg.sender == creator, 'UnAuthorized');
        for(uint i=0;i < size;i++){
            if(addr[i] == newAdd){
                for(uint j=i;j < size - 1 ; j++){
                    addr[j] = addr[j+1];
                }
                addr.pop();
                size -= 1;
                return 1;
            }
        }
        return 0;
    }

    function getBalanceOfGivenTokens(address userAddress, address[] calldata gaddr) public view returns(uint[] memory){
        uint size1 = gaddr.length;
        uint[] memory balance = new uint[](size1);
        balance[0] = 4;
        for(uint i =0;i<size1;i++){
            balance[i] = getBalanceOfToken(userAddress, gaddr[i]);
        }
        return balance;
    }

    function getBalanceOfTokens(address userAddress) public view returns(uint[] memory){
        uint[] memory balance = new uint[](size);
        balance[0] = 4;
        for(uint i =0;i<size;i++){
            balance[i] = getBalanceOfToken(userAddress, addr[i]);
        }
        return balance;
    }
}