import { getEntryPoint, getTokenId } from "../utils";

export function tabiPayloadToken(name: string, symbol: string) {
  return {
    token_id: getTokenId(name),
    tabi: {
      items: [
        {
          pattern: `%1_selfaddress_transfer %3_u64_8 ${symbol} to %2_address`,
          entry_point: getEntryPoint("transfer"),
        },
        {
          pattern: `%1_selfaddress_approve %2_address to transfer up to %3_u64_8 ${symbol}`,
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern: `mint %2_u64_8 ${symbol} to %1_address`,
          entry_point: getEntryPoint("mint"),
        },
        {
          pattern: `%1_selfaddress_burn %2_u64_8 ${symbol}`,
          entry_point: getEntryPoint("burn"),
        },
        {
          pattern: `transfer %3_u64_8 ${symbol} from %1_address to %2_address`,
          entry_point: getEntryPoint("transfer"),
        },
        {
          pattern: `approve %2_address to transfer up to %3_u64_8 ${symbol} from %1_address`,
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern: `burn %2_u64_8 ${symbol} from %1_address`,
          entry_point: getEntryPoint("burn"),
        },
      ],
    },
  };
}
