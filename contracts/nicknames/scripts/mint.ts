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
  const regs =
    networkName === "mainnet"
      ? // mainnet
        [
          {
            name: "koin",
            address: "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL",
          },
          {
            name: "vhp",
            address: "18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr",
          },
          {
            name: "pob",
            address: "159myq5YUhhoVWu3wsHKHiJYKPKGUrGiyv",
          },
          {
            name: "claim",
            address: "18zw3ZokdfHtudzaWAUnU4tUvKzKiJeN76",
          },
          {
            name: "governance",
            address: "19qj51eTbSFJYU7ZagudkpxPgNSzPMfdPX",
          },
          {
            name: "name-service",
            address: "19WxDJ9Kcvx4VqQFkpwVmwVEy1hMuwXtQE",
          },
          {
            name: "resources",
            address: "1HGN9h47CzoFwU2bQZwe6BYoX4TM6pXc4b",
          },
          {
            name: "nicknames",
            address: "1KD9Es7LBBjA1FY3ViCgQJ7e6WH1ipKbhz",
          },
        ]
      : // harbinger
        [
          {
            name: "koin",
            address: "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju",
          },
          {
            name: "vhp",
            address: "17n12ktwN79sR6ia9DDgCfmw77EgpbTyBi",
          },
          {
            name: "pob",
            address: "1MAbK5pYkhp9yHnfhYamC3tfSLmVRTDjd9",
          },
          {
            name: "governance",
            address: "17MjUXDCuTX1p9Kyqy48SQkkPfKScoggo",
          },
          {
            name: "resources",
            address: "16X6cKyqiT8EzPEksRJxXcqMnHMMm9Vxct",
          },
          {
            name: "nicknames",
            address: "1AuJQxqqyBZXqqugTQZzXRVRmEYJtsMYQ8",
          },
        ];

  const tx = new Transaction({
    signer: nick.signer as Signer,
    provider: nick.provider,
    options: nick.options,
  });

  for (let i = 0; i < regs.length; i += 1) {
    const tokenId = encodeHex(regs[i].name);
    await tx.pushOperation(nick.functions.mint, {
      to: nick.getId(),
      token_id: tokenId,
    });
    await tx.pushOperation(nick.functions.transfer_to_community, {
      from: nick.getId(),
      to: regs[i].address,
      token_id: tokenId,
    });
  }

  const receipt = await tx.send();
  console.log(receipt);
  console.log("Transaction submitted");
  const { blockNumber } = await tx.wait();
  console.log(`names registered in block number ${blockNumber} (${networkName})`);
})();
