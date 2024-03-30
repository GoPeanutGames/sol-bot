import * as anchor from "@coral-xyz/anchor";

const {
  PublicKey, TransactionMessage, AddressLookupTableAccount,
  VersionedTransaction, TransactionInstruction,
} = anchor.web3;

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
}

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
}

const deserializeInstruction = (instruction) => {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
};

const getAddressLookupTableAccounts = async (connection, keys) => {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(keys.map((key) => new PublicKey(key)));

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];

    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });

      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, []);
};

/// Use Jupyter aggregator to swap the given sellToken into buyToken
export const createSwapTx = async (
  connection, userPukey, inputMint, outputMint,
  amount, slippageBps, extraIxs=[],
) => {
  const quoteResponse = await fetchQuoteResponse(inputMint, outputMint, amount, slippageBps);
  const swapIxs = await fetchSwapIx(quoteResponse, userPukey);

  const {
    setupInstructions, // Setup missing ATA for the users.
    swapInstruction: swapInstructionPayload, // The actual swap instruction.
    cleanupInstruction, // Unwrap the SOL if `wrapAndUnwrapSol = true`.
    addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
  } = swapIxs;

  const addressLookupTableAccounts = await getAddressLookupTableAccounts(connection, addressLookupTableAddresses);
  const blockhash = (await connection.getLatestBlockhash()).blockhash;

  const setupIxs = setupInstructions ? setupInstructions.map(deserializeInstruction) : [];
  const cleanupIxs = cleanupInstruction ? deserializeInstruction(cleanupInstruction) : [];

  const messageV0 = new TransactionMessage({
    payerKey: userPukey,
    recentBlockhash: blockhash,
    instructions: [
      ...setupIxs,
      deserializeInstruction(swapInstructionPayload),
      ...cleanupIxs,
      ...extraIxs,
    ],
  }).compileToV0Message(addressLookupTableAccounts);

  return new VersionedTransaction(messageV0);;
}
