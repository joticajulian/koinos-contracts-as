import {
  Base58,
  MockVM,
  Protobuf,
  StringBytes,
  System,
  chain,
} from "@koinos/sdk-as";
import { nft } from "@koinosbox/contracts";
import { Nicknames } from "../Nicknames";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");
const USER_ID = Base58.decode("1FkSxrCK6D3ELi2taw8QLgxPMBUnnoxfgy");

describe("Nicknames", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
  });

  it("should get the levenshtein distance", () => {
    const nick = new Nicknames();
    expect(nick.levenshtein_distance("monkey", "money")).toBe(1);
    expect(nick.levenshtein_distance("koin", "konn")).toBe(1);
    expect(nick.levenshtein_distance("google", "googel")).toBe(2);
    expect(nick.levenshtein_distance("virtualhashpower", "virtualhash")).toBe(
      5
    );
    expect(nick.levenshtein_distance("koinos", "")).toBe(6);
    expect(nick.levenshtein_distance("", "koinos")).toBe(6);
  });

  it("should verify valid names", () => {
    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian"));
    }).not.toThrow();

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian.gonzalez"));
    }).not.toThrow();

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian-gonzalez0"));
    }).not.toThrow();
  });

  it("should reject invalid names", () => {
    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("julian.koin"));
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "dots must divide words of at least 5 characters"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("0koinos"));
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "words must start with a lowercase letter"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("x"));
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "the name must have between 5 and 32 characters"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("x------"));
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe("invalid segment '--'");

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("abcdef-"));
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe(
      "words must end with lowercase letters or numbers"
    );

    expect(() => {
      const nick = new Nicknames();
      nick.verifyValidName(StringBytes.stringToBytes("abc?de0"));
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
      "'googel' is similar to the existing name 'google'"
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
      "'aljce' is similar to the existing name 'alice'"
    );
  });
});
