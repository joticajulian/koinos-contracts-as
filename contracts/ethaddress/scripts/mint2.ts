/**
 * Script to reserve names for exchanges and others
 */

import { Transaction, Signer } from "koilib";
import { getContract } from "../../../scripts/getContract";

function encodeHex(value: string): string {
  return `0x${Buffer.from(new TextEncoder().encode(value)).toString("hex")}`;
}

function decodeHex(hex: string): string {
  return new TextDecoder().decode(Buffer.from(hex.replace("0x", ""), "hex"));
}

const [inputNetworkName] = process.argv.slice(2);
const networkName = inputNetworkName || "harbinger";

(async () => {
  const nick = getContract("nicknames", { networkName });
  const names = [
    "mexc",
    "chainge",
    "binance",
    "coinbase",
    "kraken",
    "kucoin",
    "bybit",
    "okx",
    "bitstamp",
    "gate-io",
    "gate",
    "bitfinex",
    "huobi",
    "gemini",
    "bithumb",
    "crypto",
    "crypto.com",
    "coincheck",
    "bitflyer",
    "bitget",
    "bittrex",
    "coinstore",
    "ethereum",
    "uphold",
  ];

  const tx = new Transaction({
    signer: nick.signer as Signer,
    provider: nick.provider,
    options: nick.options,
  });

  for (let i = 0; i < names.length; i += 1) {
    const tokenId = encodeHex(names[i]);
    await tx.pushOperation(nick.functions.mint, {
      to: nick.getId(),
      token_id: tokenId,
    });
    await tx.pushOperation(nick.functions.transfer, {
      from: nick.getId(),
      to: "1MdqwaSBy6rbasPJ9vmg2pZFJSVZ29GFpZ",
      token_id: tokenId,
    });
  }

  const receipt = await tx.send();
  console.log(receipt);
  console.log("Transaction submitted");
  const { blockNumber } = await tx.wait();
  console.log(
    `names registered in block number ${blockNumber} (${networkName})`
  );
})();
