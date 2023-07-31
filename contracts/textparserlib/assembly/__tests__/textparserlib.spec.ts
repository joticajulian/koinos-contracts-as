import {
  Base58,
  MockVM,
  Arrays,
  Protobuf,
  authority,
  chain,
  System,
} from "@koinos/sdk-as";
import { TextParserLib, typeData } from "../TextParserLib";
import { textparserlib } from "../proto/textparserlib";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");
const MOCK_ACCT1 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG");
const MOCK_ACCT2 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqK");

describe("TextParserlib", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
  });

  it("should parse a number", () => {
    const lib = new TextParserLib();
    expect(lib.parseNumberWithDecimals("0", 0, typeData.uint64).uint64).toBe(0);
    expect(lib.parseNumberWithDecimals("-0", 0, typeData.int64).uint64).toBe(0);
    expect(lib.parseNumberWithDecimals("0.", 0, typeData.uint64).error).toBe(
      "invalid number 0."
    );
    expect(
      lib.parseNumberWithDecimals("34.56", 3, typeData.uint64).uint64
    ).toBe(34560);
    expect(
      lib.parseNumberWithDecimals("34.56", 3, typeData.uint32).uint32
    ).toBe(34560);
    expect(lib.parseNumberWithDecimals("200", 6, typeData.uint64).uint64).toBe(
      200000000
    );
    expect(lib.parseNumberWithDecimals("200", 6, typeData.uint32).uint32).toBe(
      200000000
    );
    expect(lib.parseNumberWithDecimals("-200", 6, typeData.int64).int64).toBe(
      -200000000
    );
    expect(lib.parseNumberWithDecimals("-200", 6, typeData.int32).int32).toBe(
      -200000000
    );
    expect(
      lib.parseNumberWithDecimals("4000100100.987654321", 9, typeData.uint64)
        .uint64
    ).toBe(4000100100987654321);
    expect(
      lib.parseNumberWithDecimals("18446.744073709551615", 15, typeData.uint64)
        .uint64
    ).toBe(u64.MAX_VALUE);
    expect(lib.parseNumberWithDecimals("-34.56", 3, typeData.int64).int64).toBe(
      -34560
    );
    expect(lib.parseNumberWithDecimals("-34.56", 3, typeData.int32).int32).toBe(
      -34560
    );
    expect(lib.parseNumberWithDecimals(".744", 2, typeData.uint64).error).toBe(
      "invalid number .744"
    );
    expect(
      lib.parseNumberWithDecimals("-12.744", 2, typeData.uint64).error
    ).toBe("-12.744 must be positive");
    expect(lib.parseNumberWithDecimals("1.744", 2, typeData.uint64).error).toBe(
      "invalid number 1.744"
    );
    expect(
      lib.parseNumberWithDecimals("00.744", 2, typeData.uint64).error
    ).toBe("invalid number 00.744");
    expect(
      lib.parseNumberWithDecimals("0.76x0", 4, typeData.uint64).error
    ).toBe("0.76x0 is not a number");
    expect(
      lib.parseNumberWithDecimals("--12.744", 2, typeData.int64).error
    ).toBe("--12.744 is not a number");
  });
});
