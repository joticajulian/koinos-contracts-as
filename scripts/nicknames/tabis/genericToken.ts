import { getEntryPoint, getTokenId } from "../utils";

export function tabiPayloadGenericToken() {
  return {
    token_id: getTokenId("generic-token"),
    tabi: {
      items: [
        {
          pattern: "%1_selfaddress_transfer %3_u64 to %2_address",
          entry_point: getEntryPoint("transfer"),
        },
        {
          pattern: "%1_selfaddress_approve %2_address to transfer up to %3_u64",
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern: "mint %2_u64 to %1_address",
          entry_point: getEntryPoint("mint"),
        },
        {
          pattern: "%1_selfaddress_burn %2_u64",
          entry_point: getEntryPoint("burn"),
        },
        {
          pattern: "transfer %3_u64 from %1_address to %2_address",
          entry_point: getEntryPoint("transfer"),
        },
        {
          pattern:
            "approve %2_address to transfer up to %3_u64 from %1_address",
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern: "burn %2_u64 from %1_address",
          entry_point: getEntryPoint("burn"),
        },
      ],
    },
  };
}
