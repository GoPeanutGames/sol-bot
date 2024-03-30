'use strict';

var anchor = require('@coral-xyz/anchor');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var anchor__namespace = /*#__PURE__*/_interopNamespaceDefault(anchor);

const {BN} = anchor__namespace.default;

const {
  PublicKey: PublicKey$1, TransactionMessage, AddressLookupTableAccount,
  VersionedTransaction, TransactionInstruction,
} = anchor__namespace.web3;

const QUOTE_ENDPOINT = "https://quote-api.jup.ag/v6/quote";
const SWAP_IX_ENDPOINT = "https://quote-api.jup.ag/v6/swap-instructions";

/// Returns the quote for a swap from inputMint to the outMint for the given amount
/// slippageBps is in BPS https://www.investopedia.com/ask/answers/what-basis-point-bps
/// docs here https://station.jup.ag/api-v6/get-quote
const fetchQuoteResponse = async (inputMint, outputMint, amount, slippageBps) => {
  const quoteResponse = await (
    await fetch(
      `${QUOTE_ENDPOINT}?`
      + `inputMint=${inputMint}`
      + `&outputMint=${outputMint}`
      + `&amount=${amount}`
      + `&slippageBps=${slippageBps}`
      + `&swapMode=ExactOut`
    )
  ).json();

  return quoteResponse;
};

/// Returns instructions that you can use from the quote you get from /quote
const fetchSwapIx = async (quoteResponse, userPublicKey) => {
  const instructions = await (
    await fetch(SWAP_IX_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({quoteResponse, userPublicKey})
    })
  ).json();

  if (instructions.error) {
    throw new Error("Failed to get swap instructions: " + instructions.error);
  }

  return instructions;
};

const deserializeInstruction = (instruction) => {
  return new TransactionInstruction({
    programId: new PublicKey$1(instruction.programId),
    keys: instruction.accounts.map((key) => ({
      pubkey: new PublicKey$1(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
};

const getAddressLookupTableAccounts = async (connection, keys) => {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(keys.map((key) => new PublicKey$1(key)));

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];

    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey$1(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });

      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, []);
};

/// Use Jupyter aggregator to swap the given sellToken into buyToken
const createSwapTx = async (
  connection, userPukey, inputMint, outputMints, amount, slippageBps, extraIxs=[],
) => {
  if(outputMints.length > 1) {
    throw new Error("Max output accounts is 1");
  }

  const swapAmount = new BN(Math.floor(amount / outputMints.length));
  
  const quoteResponses = await Promise.all(
    outputMints.map(outputMint => fetchQuoteResponse(inputMint, outputMint, swapAmount, slippageBps))
  );
  const swapIxs = await Promise.all(
    quoteResponses.map(quoteResponse => fetchSwapIx(quoteResponse, userPukey))
  );

  const payload = await swapIxs.reduce(async (acc, swapIxs) => {
    await acc;

    const {
      setupInstructions, // Setup missing ATA for the users.
      swapInstruction: swapInstructionPayload, // The actual swap instruction.
      cleanupInstruction, // Unwrap the SOL if `wrapAndUnwrapSol = true`.
      addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
    } = swapIxs;
  
    const addressLookupTableAccounts = await getAddressLookupTableAccounts(connection, addressLookupTableAddresses);
    
    const setupIxs = setupInstructions ? setupInstructions.map(deserializeInstruction) : [];
    const cleanupIx = cleanupInstruction ? deserializeInstruction(cleanupInstruction) : [];  
    
    return {
      lut: [...acc.lut, ...addressLookupTableAccounts],
      ixs: [
        ...acc.ixs,
        ...[
          ...setupIxs,
          deserializeInstruction(swapInstructionPayload),
          cleanupIx,
          ...extraIxs,
        ]
      ]
    }
  }, {
    lut: [],
    ixs: [],
  });
  
  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: userPukey,
    recentBlockhash: blockhash,
    instructions: payload.ixs,
  }).compileToV0Message(payload.lut);

  return new VersionedTransaction(messageV0);};

const {PublicKey} = anchor__namespace.web3;

const TokenMintAccounts = {
  WSOL: {
    mint: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  }
};

/// @param provider - The solana web3 provider. In web environments this will be provided by the browser wallet
/// @param userAccount - the public key of the user wallet
/// @param outputMints - a list of public keys representing the mint accounts we are swapping SOL for
/// @param slippageBps - slippage bps to be applied during the swap. default is 1%
/// @param amount - total amount of SOL to be swapped
const swap = async (
  provider, userAccount, outputMints, amount, slippageBps=100
) => {
  // Swap SOL for all outputMints. The sol amount will be split equally
  const swapTx = await createSwapTx(
    provider.connection,
    userAccount,
    TokenMintAccounts.WSOL.mint.toBase58(),
    outputMints,
    amount,
    slippageBps,
    [],
  );
  
  return await provider.sendAndConfirm(swapTx);
};

exports.swap = swap;
