const sdk = require('@defillama/sdk');

const parse = async (row) => {
  const { collection, tokenId } = { ...row };
  let creator;

  try {
    // foundation
    if (collection === '0x3b3ee1931dc30c1957379fac9aba94d1c48a5405') {
      const abi = {
        inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
        name: 'tokenCreator',
        outputs: [
          { internalType: 'address payable', name: '', type: 'address' },
        ],
        stateMutability: 'view',
        type: 'function',
      };

      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi,
        })
      ).output;
      // superrare old
    } else if (collection === '0x41a322b28d0ff354040e2cbc676f0320d8c8850d') {
      const abi = {
        constant: true,
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        name: 'creatorOfToken',
        outputs: [{ name: '', type: 'address' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      };
      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi,
        })
      ).output;
      // superrare new
    } else if (collection === '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0') {
      const abi = {
        constant: true,
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        name: 'tokenCreator',
        outputs: [{ name: '', type: 'address' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      };
      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi,
        })
      ).output;
      // makersplace
    } else if (
      [
        '0xcd51b81ac1572707b7f3051aa97a31e2afb27d45',
        '0x2963ba471e265e5f51cafafca78310fe87f8e6d1',
      ].includes(collection)
    ) {
      const abi1 = {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'tokenIdToDigitalMediaRelease',
        outputs: [
          { internalType: 'uint32', name: 'printEdition', type: 'uint32' },
          { internalType: 'uint256', name: 'digitalMediaId', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      };
      const abi2 = {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'idToDigitalMedia',
        outputs: [
          { internalType: 'uint32', name: 'totalSupply', type: 'uint32' },
          { internalType: 'uint32', name: 'printIndex', type: 'uint32' },
          { internalType: 'address', name: 'creator', type: 'address' },
          { internalType: 'uint16', name: 'royalty', type: 'uint16' },
          { internalType: 'bool', name: 'immutableMedia', type: 'bool' },
          { internalType: 'string', name: 'metadataPath', type: 'string' },
        ],
        stateMutability: 'view',
        type: 'function',
      };

      const mediaId = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi: abi1,
        })
      ).output.digitalMediaId;

      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: mediaId,
          abi: abi2,
        })
      ).output.creator;
    } else if (collection === '0x2a46f2ffd99e19a89476e2f62270e0a35bbf0756') {
      const abi1 = {
        constant: true,
        inputs: [{ name: '', type: 'uint256' }],
        name: 'tokenIdToDigitalMediaRelease',
        outputs: [
          { name: 'printEdition', type: 'uint32' },
          { name: 'digitalMediaId', type: 'uint256' },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      };
      const abi2 = {
        constant: true,
        inputs: [{ name: '_id', type: 'uint256' }],
        name: 'getDigitalMedia',
        outputs: [
          { name: 'id', type: 'uint256' },
          { name: 'totalSupply', type: 'uint32' },
          { name: 'printIndex', type: 'uint32' },
          { name: 'collectionId', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'metadataPath', type: 'string' },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      };

      const mediaId = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi: abi1,
        })
      ).output.digitalMediaId;

      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: mediaId,
          abi: abi2,
        })
      ).output.creator;

      // zora
    } else if (collection === '0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7') {
      const abi = {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'tokenCreators',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      };

      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi,
        })
      ).output;
      // knownorigin
    } else if (collection === '0xdde2d979e8d39bb8416eafcfc1758f3cab2c9c72') {
      const abi = {
        constant: true,
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        name: 'editionInfo',
        outputs: [
          { name: '_tokId', type: 'uint256' },
          { name: '_edition', type: 'bytes16' },
          { name: '_editionNumber', type: 'uint256' },
          { name: '_tokenURI', type: 'string' },
          { name: '_artistAccount', type: 'address' },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      };

      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi,
        })
      ).output._artistAccount;
    } else if (collection === '0xfbeef911dc5821886e1dda71586d90ed28174b7d') {
      const abi1 = {
        constant: true,
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        name: 'editionOfTokenId',
        outputs: [{ name: '_editionNumber', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      };

      const abi2 = {
        constant: true,
        inputs: [{ name: 'editionNumber', type: 'uint256' }],
        name: 'detailsOfEdition',
        outputs: [
          { name: '_editionData', type: 'bytes32' },
          { name: '_editionType', type: 'uint256' },
          { name: '_startDate', type: 'uint256' },
          { name: '_endDate', type: 'uint256' },
          { name: '_artistAccount', type: 'address' },
          { name: '_artistCommission', type: 'uint256' },
          { name: '_priceInWei', type: 'uint256' },
          { name: '_tokenURI', type: 'string' },
          { name: '_totalSupply', type: 'uint256' },
          { name: '_totalAvailable', type: 'uint256' },
          { name: '_active', type: 'bool' },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      };

      const editionNumber = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi: abi1,
        })
      ).output;

      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: editionNumber,
          abi: abi2,
        })
      ).output._artistAccount;
    } else if (collection === '0xabb3738f04dc2ec20f4ae4462c3d069d02ae045b') {
      const abi = {
        inputs: [
          { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
        ],
        name: 'getCreatorOfToken',
        outputs: [
          {
            internalType: 'address',
            name: '_originalCreator',
            type: 'address',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      };

      creator = (
        await sdk.api.abi.call({
          target: collection,
          params: tokenId,
          abi,
        })
      ).output;
    }
  } catch (err) {
    return;
  }

  return creator;
};

module.exports = { parse };
