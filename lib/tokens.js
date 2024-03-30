import * as anchor from "@coral-xyz/anchor";

const {PublicKey} = anchor.web3

export const TokenMintAccounts = {
  WSOL: {
    mint: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  },
  BURRRD_TOKEN: {
    mint: new PublicKey("F8qtcT3qnwQ24CHksuRrSELtm5k9ob8j64xAzj3JjsMs"),
    decimals: 4,
  },
  BONK_TOKEN: {
    mint: new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
    decimals: 5,
  },
  PONKE_TOKEN: {
    mint: new PublicKey("5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC"),
    decimals: 9,
  }
}
