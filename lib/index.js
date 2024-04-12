import {createSwapTx} from "./jupyter";
import {TokenMintAccounts} from "./tokens";

/// @param provider - The solana web3 provider. In web environments this will be provided by the browser wallet
/// @param userAccount - the public key of the user wallet
/// @param outputMints - a list of public keys representing the mint accounts we are swapping SOL for
/// @param amount - total amount of SOL to be swapped
/// @param treasury - the wallet that receives the tax fee
/// @param slippageBps - slippage bps to be applied during the swap. default is 1%
export const swap = async (
  provider, userAccount, outputMints, amount, treasury, slippageBps=100
) => {
  // Swap SOL for all outputMints. The sol amount will be split equally
  const swapTx = await createSwapTx(
    provider.connection,
    userAccount,
    TokenMintAccounts.WSOL.mint.toBase58(),
    outputMints,
    amount,
    slippageBps,
    treasury,
    [],
  );
  
  return swapTx.serialize();
}
