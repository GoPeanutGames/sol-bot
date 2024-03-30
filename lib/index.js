import {createSwapTx} from "./jupyter";
import {TokenMintAccounts} from "./tokens";

/// @param provider - The solana web3 provider. In web environments this will be provided by the browser wallet
/// @param userAccount - the public key of the user wallet
/// @param slippageBps - slippage bps to be applied during the swap. default is 1%
/// @param amount - total amount of SOL to be swapped
export const swap = async (provider, userAccount, amount, slippageBps=100) => {
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
}
