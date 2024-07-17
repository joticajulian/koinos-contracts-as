import {
  Base58,
  MockVM,
  chain,
  system_calls,
} from "@koinos/sdk-as";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");
const USER_ID = Base58.decode("1FkSxrCK6D3ELi2taw8QLgxPMBUnnoxfgy");

describe("Ethaddress", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
    const result = new system_calls.exit_arguments(
      0,
      new chain.result(new Uint8Array(0))
    );
    MockVM.setCallContractResults([result, result, result]);
  });
});
