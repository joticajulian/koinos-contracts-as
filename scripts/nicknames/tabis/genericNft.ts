import { getEntryPoint, getTokenId } from "../utils";

export function tabiPayloadGenericNft() {
  return {
    token_id: getTokenId("generic-nft"),
    tabi: {
      items: [
        {
          pattern: "%1_selfaddress_transfer %3_bytes_hex to %2_address",
          entry_point: getEntryPoint("transfer"),
        },
        {
          pattern: "%1_selfaddress_approve %2_address to transfer %3_bytes_hex",
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern:
            "%1_selfaddress_approve %2_address to transfer any nft = %3_bool",
          entry_point: getEntryPoint("set_approval_for_all"),
        },
        {
          pattern: "mint %2_bytes_hex to %1_address",
          entry_point: getEntryPoint("mint"),
        },
        {
          pattern: "%1_selfaddress_burn %2_bytes_hex",
          entry_point: getEntryPoint("burn"),
        },
      ],
    },
  };
}
