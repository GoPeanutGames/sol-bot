import * as anchor from "@coral-xyz/anchor";

const {PublicKey} = anchor.web3

export const TokenMintAccounts = {
  WSOL: {
    mint: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  }
}
