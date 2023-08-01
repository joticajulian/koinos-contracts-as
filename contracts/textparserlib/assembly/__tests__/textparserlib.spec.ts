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
    expect(lib.parseNumberWithDecimals("0", 0, "u64").uint64).toBe(0);
    expect(lib.parseNumberWithDecimals("-0", 0, "i64").uint64).toBe(0);
    expect(lib.parseNumberWithDecimals("0.", 0, "u64").error).toBe(
      "invalid number 0."
    );
    expect(lib.parseNumberWithDecimals("34.56", 3, "u64").uint64).toBe(34560);
    expect(lib.parseNumberWithDecimals("34.56", 3, "u32").uint32).toBe(34560);
    expect(lib.parseNumberWithDecimals("200", 6, "u64").uint64).toBe(200000000);
    expect(lib.parseNumberWithDecimals("200", 6, "u32").uint32).toBe(200000000);
    expect(lib.parseNumberWithDecimals("-200", 6, "i64").int64).toBe(
      -200000000
    );
    expect(lib.parseNumberWithDecimals("-200", 6, "i32").int32).toBe(
      -200000000
    );
    expect(
      lib.parseNumberWithDecimals("4000100100.987654321", 9, "u64").uint64
    ).toBe(4000100100987654321);
    expect(
      lib.parseNumberWithDecimals("18446.744073709551615", 15, "u64").uint64
    ).toBe(u64.MAX_VALUE);
    expect(lib.parseNumberWithDecimals("-34.56", 3, "i64").int64).toBe(-34560);
    expect(lib.parseNumberWithDecimals("-34.56", 3, "i32").int32).toBe(-34560);
    expect(lib.parseNumberWithDecimals(".744", 2, "u64").error).toBe(
      "invalid number .744"
    );
    expect(lib.parseNumberWithDecimals("-12.744", 2, "u64").error).toBe(
      "-12.744 must be positive"
    );
    expect(lib.parseNumberWithDecimals("1.744", 2, "u64").error).toBe(
      "invalid number 1.744"
    );
    expect(lib.parseNumberWithDecimals("00.744", 2, "u64").error).toBe(
      "invalid number 00.744"
    );
    expect(lib.parseNumberWithDecimals("0.76x0", 4, "u64").error).toBe(
      "0.76x0 is not a number"
    );
    expect(lib.parseNumberWithDecimals("--12.744", 2, "i64").error).toBe(
      "--12.744 is not a number"
    );
  });

  it("should split a phrase", () => {
    const lib = new TextParserLib();
    expect(lib.splitPhrase(`sketch right sense`).words).toStrictEqual([
      "sketch",
      "right",
      "sense",
    ]);
    expect(lib.splitPhrase(`immune "magnet toss"`).words).toStrictEqual([
      "immune",
      "magnet toss",
    ]);
    expect(
      lib.splitPhrase(`burger "mail sample" "blouse choise" ethics`).words
    ).toStrictEqual(["burger", "mail sample", "blouse choise", "ethics"]);
    expect(
      lib.splitPhrase(`crater { "until cream" "regular flock" husband}`).words
    ).toStrictEqual(["crater", `{ "until cream" "regular flock" husband}`]);
    expect(
      lib.splitPhrase(`story { "height deal" "usage margin" learn} whale`).words
    ).toStrictEqual([
      "story",
      `{ "height deal" "usage margin" learn}`,
      "whale",
    ]);
    expect(
      lib.splitPhrase(`foam { "pudding girl" { "black top" } come} enlist`)
        .words
    ).toStrictEqual([
      "foam",
      `{ "pudding girl" { "black top" } come}`,
      "enlist",
    ]);

    // special characters
    expect(
      lib.splitPhrase(
        `"\\"alice\\"" "{{{{" "{\\"}}}{" { "{" } tone { { "\\"}" } }`
      ).words
    ).toStrictEqual([
      `"alice"`,
      "{{{{",
      `{"}}}{`,
      `{ "{" }`,
      "tone",
      `{ { "\\"}" } }`,
    ]);

    // arrays
    const input = `pair { own dress screen } { kite party mushroom } { popular pilot "high brand" }`;
    expect(lib.splitPhrase(input).words).toStrictEqual([
      "pair",
      `{ own dress screen } { kite party mushroom } { popular pilot "high brand" }`,
    ]);
    expect(lib.splitPhrase(input, false).words).toStrictEqual([
      "pair",
      `{ own dress screen }`,
      `{ kite party mushroom }`,
      `{ popular pilot "high brand" }`,
    ]);

    // errors
    expect(lib.splitPhrase(`" " "`).error).toBe("missing end quote");
    expect(lib.splitPhrase(`"distance "slogan`).error).toBe(
      "invalid quote delimitation 1"
    );
    expect(lib.splitPhrase(`year"`).error).toBe("invalid quote delimitation 2");
    expect(lib.splitPhrase(`siege"army"`).error).toBe(
      "invalid quotes in the middle of a word"
    );
    expect(lib.splitPhrase(`table{}`).error).toBe(
      "invalid brackets in the middle of a word"
    );
    expect(lib.splitPhrase(`{ { fluid }`).error).toBe(
      "missing closing bracket"
    );
    expect(lib.splitPhrase(`{ diamond } }`).error).toBe(
      "extra closing bracket"
    );
  });

  it("should split a phrase pattern", () => {
    const lib = new TextParserLib();
    expect(lib.splitPhrasePattern(`sell useful vibrant`).words).toStrictEqual([
      "sell",
      "useful",
      "vibrant",
    ]);
    expect(lib.splitPhrasePattern(`sell %1_string`).words).toStrictEqual([
      "sell",
      "%1_string",
    ]);
    expect(
      lib.splitPhrasePattern(`sell %1_nested { name %1_string }`).words
    ).toStrictEqual(["sell", "%1_nested { name %1_string }"]);
    expect(
      lib.splitPhrasePattern(`buy %1_repeated { id %1_string }`).words
    ).toStrictEqual(["buy", "%1_repeated { id %1_string }"]);
    expect(
      lib.splitPhrasePattern(
        `buy %1_repeated { id %1_string %2_nested { %1_id } }`
      ).words
    ).toStrictEqual([
      "buy",
      "%1_repeated { id %1_string %2_nested { %1_id } }",
    ]);

    // errors
    expect(lib.splitPhrasePattern("%").error).toBe("invalid pattern %");
    expect(lib.splitPhrasePattern("solution{expose").error).toBe(
      "invalid brackets in the middle of a word in the pattern"
    );
    expect(lib.splitPhrasePattern("rabbit}future").error).toBe(
      "invalid brackets in the middle of a word in the pattern"
    );
    expect(lib.splitPhrasePattern("{").error).toBe(
      "invalid bracket delimitation 1"
    );
    expect(lib.splitPhrasePattern("}").error).toBe(
      "invalid bracket delimitation 2"
    );
    expect(lib.splitPhrasePattern("%1_nested %1_string").error).toBe(
      "invalid bracket delimitation 3"
    );
    expect(lib.splitPhrasePattern("%1_string { %1_string }").error).toBe(
      "invalid bracket delimitation 1"
    );
    expect(lib.splitPhrasePattern("%1_nested{ %1_string }").error).toBe(
      "invalid brackets in the middle of a word in the pattern"
    );

    // invalid patterns that are not validated here
    // (they must be validated in the creation of the patterns)
    expect(
      lib.splitPhrasePattern("%1_repeated chat { %1_string }").words
    ).toStrictEqual(["%1_repeated", "chat { %1_string }"]);
    expect(lib.splitPhrasePattern("%wire_maze").words).toStrictEqual([
      "%wire_maze",
    ]);
    expect(lib.splitPhrasePattern("%1_string_extra").words).toStrictEqual([
      "%1_string_extra",
    ]);
  });
});
