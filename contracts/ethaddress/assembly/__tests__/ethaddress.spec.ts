import { Base58, MockVM, chain, system_calls } from "@koinos/sdk-as";

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

  it("test hex string", () => {
    const address = new Uint8Array(7);
    address.set([0xfe, 0x35, 0xc4, 0x4a, 0x00, 0x04, 0x50]);
    let hex = "";
    for (let i = 0; i < address.length; i += 1) {
      hex += address[i].toString(16);
    }
    expect(hex).toBe("4");
  });
});
