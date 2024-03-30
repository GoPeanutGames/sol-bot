export const signAndSend = async(provider, tx, signers) => {
  let latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");

  // Step 1 - Sign your transaction with the required `Signers`
  tx.sign(signers);
  
  // Step 2 - Send our v0 transaction to the cluster
  const txid = await provider.connection.sendTransaction(tx, {maxRetries: 5});

  // Step 3 - Confirm Transaction
  const confirmation = await provider.connection.confirmTransaction({
    signature: txid,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    throw new Error(`   ❌ - Transaction not confirmed.\nReason: ${confirmation.value.err}`);
  }
}
