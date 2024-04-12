import * as anchor from "@coral-xyz/anchor";
import {swap} from "@GoPeanutGames/swap-lib"

const {PublicKey, VersionedTransaction} = anchor.web3;

const getClusterUrl = () => {
  switch(process.env.ENV) {
    case "dev":
      return "http://localhost:8899"
    case "testnet":
      return "https://api.testnet.solana.com"
    case "mainnet":
      return "https://api.mainnet-beta.solana.com"
  }
}

export const provider = anchor.AnchorProvider.local(
  getClusterUrl(),
  {preflightCommitment: "confirmed"}
)

anchor.setProvider(provider);


const main = async () => {
  // 1. FE sends a request to the back-end API which will create the swap transaction via a call to
  // the `@GoPeanutGames/swap-lib` package.
  const serializedTx = await swap(
    provider,
    new PublicKey("5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9"),
    [
      new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
    ],
    100_000_000_000, // 100 SOL
    new PublicKey("5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9"),
  );

  // 2. The back end returns a serialized transaction. On the front-end you got to deserialize into
  const swapTx = VersionedTransaction.deserialize(serializedTx);
  console.log("swapTx => ", swapTx)

  // 3. The FE will sign and send this transaction
  // return await provider.sendAndConfirm(swapTx);
}

main()
.then(() => console.log("Success!"))
.catch((error) => console.log("Error: ", error) )
