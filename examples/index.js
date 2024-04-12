import * as anchor from "@coral-xyz/anchor";
import {swap} from "@GoPeanutGames/swap-lib"

const {PublicKey} = anchor.web3;

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
  await swap(
    provider,
    new PublicKey("5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9"),
    [
      new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
    ],
    new PublicKey("5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9"),
    100_000_000_000, // 100 SOL
  )
}

main()
.then(() => console.log("Success!"))
.catch((error) => console.log("Error: ", error) )
