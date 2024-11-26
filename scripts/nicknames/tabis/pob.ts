import { getEntryPoint, getTokenId } from "../utils";

export function tabiPayloadPob(koinSymbol: string) {
  return {
    token_id: getTokenId("pob"),
    tabi: {
      items: [
        {
          pattern: `%2_selfaddress_burn %1_u64_8 ${koinSymbol} to receive %3_selfaddress_VHP`,
          entry_point: getEntryPoint("burn"),
        },
        {
          pattern: `%1_selfaddress_register key %2_bytes_base64`,
          entry_point: getEntryPoint("register_public_key"),
        },
        {
          pattern: `burn %1_u64_8 ${koinSymbol} from %2_address to receive VHP in %3_address`,
          entry_point: getEntryPoint("burn"),
        },
        {
          pattern: "register key %2_bytes_base64 for producer %1_address",
          entry_point: getEntryPoint("register_public_key"),
        },
      ],
    },
  };
}
