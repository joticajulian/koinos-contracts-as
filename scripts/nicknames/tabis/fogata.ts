import { getEntryPoint, getTokenId } from "../utils";

export function tabiPayloadFogata() {
  return {
    token_id: getTokenId("fogata"),
    tabi: {
      items: [
        {
          pattern: "%1_selfaddress_stake %2_u64_8 KOIN and %3_u64_8 VHP",
          entry_point: getEntryPoint("stake"),
        },
        {
          pattern: "%1_selfaddress_unstake %2_u64_8 KOIN and %3_u64_8 VHP",
          entry_point: getEntryPoint("unstake"),
        },
        {
          pattern: "%1_selfaddress_collect",
          entry_point: getEntryPoint("collect"),
        },
        {
          pattern:
            "%1_selfaddress_set collect koin preferences: %2_u64_3 % KOIN, all after %3_u64_8 KOIN+VHP",
          entry_point: getEntryPoint("set_collect_koin_preferences"),
        },
        {
          pattern: "pay beneficiary %1_address",
          entry_point: getEntryPoint("pay_beneficiary"),
        },
        {
          pattern: "pay beneficiaries",
          entry_point: getEntryPoint("pay_beneficiaries"),
        },
        {
          pattern: "reburn and snapshot",
          entry_point: getEntryPoint("reburn_and_snapshot"),
        },
        /* TODO
        {
          pattern: "",
          entry_point: getEntryPoint("set_pool_params"),
        },
        {
          pattern: "",
          entry_point: getEntryPoint("add_reserved_koin"),
        },
        {
          pattern: "",
          entry_point: getEntryPoint("remove_reserved_koin"),
        },
        */
      ],
    },
  };
}
