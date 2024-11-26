import { getEntryPoint, getTokenId } from "../utils";

export function tabiPayloadNicknames() {
  return {
    token_id: getTokenId("nicknames"),
    tabi: {
      items: [
        {
          pattern: "%1_selfaddress_create %2_bytes_utf8",
          entry_point: getEntryPoint("mint"),
        },
        {
          pattern: "delete %2_bytes_utf8",
          entry_point: getEntryPoint("burn"),
        },
        {
          pattern: "%1_selfaddress_transfer %3_bytes_utf8 to %2_address",
          entry_point: getEntryPoint("burn"),
        },
        {
          pattern: "set metadata for %1_bytes_utf8 : %2_string",
          entry_point: getEntryPoint("set_metadata"),
        },
        {
          pattern: "set %1_bytes_utf8 as main name",
          entry_point: getEntryPoint("set_main_token"),
        },
        {
          pattern: "assign address %2_address to name %1_bytes_utf8",
          entry_point: getEntryPoint("set_address"),
        },
        {
          pattern:
            "extra metadata for %1_bytes_utf8 : permanent address = %3_bool , address only modifiable by governance = %4_bool , other = %10_bytes_base64",
          entry_point: getEntryPoint("set_extended_metadata"),
        },
        {
          pattern:
            "%1_selfaddress_approve %2_address to transfer name %3_bytes_utf8",
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern:
            "%1_selfaddress_approve %2_address to transfer any name = %3_bool",
          entry_point: getEntryPoint("set_approval_for_all"),
        },
        {
          pattern:
            "set tabi for %1_bytes_utf8 : %2_nested { %1_repeated { entry_point: %2_u32 , pattern: %1_string } }",
          entry_point: getEntryPoint("set_tabi"),
        },
      ],
    },
  };
}
