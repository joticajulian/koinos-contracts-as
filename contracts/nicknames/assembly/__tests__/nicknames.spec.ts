import {
  Base58,
  MockVM,
  Protobuf,
  StringBytes,
  System,
  chain,
  system_calls,
} from "@koinos/sdk-as";
import { nft } from "@koinosbox/contracts";
import { Nicknames } from "../Nicknames";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");
const USER_ID = Base58.decode("1FkSxrCK6D3ELi2taw8QLgxPMBUnnoxfgy");

describe("Nicknames", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
    const result = new system_calls.exit_arguments(
      0,
      new chain.result(new Uint8Array(0))
    );
    MockVM.setCallContractResults([result, result, result]);
  });

  it("should get the levenshtein distance", () => {
    const nick = new Nicknames();
    expect(nick.levenshteinDistance("monkey", "money")).toBe(1);
    expect(nick.levenshteinDistance("koin", "konn")).toBe(1);
    expect(nick.levenshteinDistance("google", "googel")).toBe(2);
    expect(nick.levenshteinDistance("virtualhashpower", "virtualhash")).toBe(5);
    expect(nick.levenshteinDistance("koinos", "")).toBe(6);
    expect(nick.levenshteinDistance("", "koinos")).toBe(6);
  });

  it("should verify valid names", () => {
    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian"), true);
    }).not.toThrow();

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian.gonzalez"), true);
    }).not.toThrow();

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian-gonzalez0"), true);
    }).not.toThrow();
  });

  it("should reject invalid names", () => {
    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian.co"), true);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "dots must divide words of at least 3 characters"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("0koinos"), true);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "words must start with a lowercase letter"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("x"), true);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "the name must have between 3 and 32 characters"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("x------"), true);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe("invalid segment '--'");

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("abcdef-"), true);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "words must end with lowercase letters or numbers"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("abc?de0"), true);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "words must contain only lowercase letters, numbers, dots, or hyphens"
    );
  });

  it("should reject new names similar to existing ones", () => {
    MockVM.setCaller(new chain.caller_data(USER_ID, chain.privilege.user_mode));

    const nick = new Nicknames();
    const mintArgs = new nft.mint_args(
      USER_ID,
      StringBytes.stringToBytes("google")
    );
    nick.callArgs = new System.getArgumentsReturn();
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    mintArgs.token_id = StringBytes.stringToBytes("alice");
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    MockVM.commitTransaction();

    expect(() => {
      const nick = new Nicknames();
      const mintArgs = new nft.mint_args(
        USER_ID,
        StringBytes.stringToBytes("googel")
      );
      nick.callArgs = new System.getArgumentsReturn();
      nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
      nick.mint(mintArgs);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "@googel is similar to the existing name @google"
    );

    expect(() => {
      const nick = new Nicknames();
      const mintArgs = new nft.mint_args(
        USER_ID,
        StringBytes.stringToBytes("aljce")
      );
      nick.callArgs = new System.getArgumentsReturn();
      nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
      nick.mint(mintArgs);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "@aljce is similar to the existing name @alice"
    );
  });

  it("should reject new names similar to existing ones", () => {
    MockVM.setCaller(new chain.caller_data(USER_ID, chain.privilege.user_mode));

    const nick = new Nicknames();
    const mintArgs = new nft.mint_args(
      USER_ID,
      StringBytes.stringToBytes("absorb")
    );
    nick.callArgs = new System.getArgumentsReturn();
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    mintArgs.token_id = StringBytes.stringToBytes("pumpkin");
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    mintArgs.token_id = StringBytes.stringToBytes("carlos1234");
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    mintArgs.token_id = StringBytes.stringToBytes("review");
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    mintArgs.token_id = StringBytes.stringToBytes("outside");
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    mintArgs.token_id = StringBytes.stringToBytes("julian");
    nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
    nick.mint(mintArgs);

    MockVM.commitTransaction();

    expect(() => {
      const nick = new Nicknames();
      const mintArgs = new nft.mint_args(
        USER_ID,
        StringBytes.stringToBytes("tpumpkin")
      );
      nick.callArgs = new System.getArgumentsReturn();
      nick.callArgs!.args = Protobuf.encode(mintArgs, nft.mint_args.encode);
      nick.mint(mintArgs);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "@tpumpkin is similar to the existing name @pumpkin"
    );
  });
});
