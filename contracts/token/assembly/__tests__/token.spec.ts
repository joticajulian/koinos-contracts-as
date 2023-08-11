import {
  Base58,
  MockVM,
  Arrays,
  Protobuf,
  authority,
  chain,
  System,
} from "@koinos/sdk-as";
import { Token } from "../Token";
import { token } from "../proto/token";

const CONTRACT_ID = Base58.decode("17NJMRU52u1bn9CHo5oWyUVkAoLhg1fsf9");
const MOCK_ACCT1 = Base58.decode("19dG7aZ6oTVCmTPrLWAd3tbKeyG4jk1bAC");
const MOCK_ACCT2 = Base58.decode("1Q6uyNtjgxv3Z3TfJ4aLNBbr2roPz2q3Rt");

describe("token", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
  });

  it("should get the name", () => {
    const tkn = new Token();
    const res = tkn.name();
    expect(res.value).toBe("My Token");
  });

  it("should get the symbol", () => {
    const tkn = new Token();
    const res = tkn.symbol();
    expect(res.value).toBe("TKN");
  });

  it("should get the decimals", () => {
    const tkn = new Token();
    const res = tkn.decimals();
    expect(res.value).toBe(8);
  });

  it("should mint tokens", () => {
    const tkn = new Token();

    MockVM.setCaller(
      new chain.caller_data(CONTRACT_ID, chain.privilege.user_mode)
    );

    // check total supply
    let totalSupplyRes = tkn.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // mint tokens
    const mintArgs = new token.mint_args(MOCK_ACCT1, 123);
    tkn.callArgs = new System.getArgumentsReturn();
    tkn.callArgs!.args = Protobuf.encode(mintArgs, token.mint_args.encode);
    tkn.mint(mintArgs);

    // check events
    const events = MockVM.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("token.mint_event");
    expect(events[0].impacted.length).toBe(1);
    expect(Arrays.equal(events[0].impacted[0], MOCK_ACCT1)).toBe(true);

    const mintEvent = Protobuf.decode<token.mint_args>(
      events[0].data!,
      token.mint_args.decode
    );
    expect(Arrays.equal(mintEvent.to, MOCK_ACCT1)).toBe(true);
    expect(mintEvent.value).toBe(123);

    // check balance
    const balanceArgs = new token.balance_of_args(MOCK_ACCT1);
    const balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    // check total supply
    totalSupplyRes = tkn.total_supply();
    expect(totalSupplyRes.value).toBe(123);
  });

  it("should not mint tokens if not contract account", () => {
    const tkn = new Token();

    MockVM.setCaller(
      new chain.caller_data(new Uint8Array(0), chain.privilege.user_mode)
    );

    // check total supply
    let totalSupplyRes = tkn.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // check balance
    const balanceArgs = new token.balance_of_args(MOCK_ACCT1);
    let balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);

    // save the MockVM state because the mint is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      // try to mint tokens
      const tkn = new Token();
      const mintArgs = new token.mint_args(MOCK_ACCT2, 123);
      tkn.mint(mintArgs);
    }).toThrow();

    // check balance
    balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);

    // check total supply
    totalSupplyRes = tkn.total_supply();
    expect(totalSupplyRes.value).toBe(0);
  });

  it("should not mint tokens if new total supply overflows", () => {
    const tkn = new Token();

    MockVM.setCaller(
      new chain.caller_data(CONTRACT_ID, chain.privilege.user_mode)
    );

    let mintArgs = new token.mint_args(MOCK_ACCT2, 123);
    tkn.callArgs = new System.getArgumentsReturn();
    tkn.callArgs!.args = Protobuf.encode(mintArgs, token.mint_args.encode);
    tkn.mint(mintArgs);

    // check total supply
    let totalSupplyRes = tkn.total_supply();
    expect(totalSupplyRes.value).toBe(123);

    MockVM.commitTransaction();

    mintArgs = new token.mint_args(MOCK_ACCT2, u64.MAX_VALUE);
    expect(() => {
      // try to mint tokens
      const tkn = new Token();
      const mintArgs = new token.mint_args(MOCK_ACCT2, u64.MAX_VALUE);
      tkn.mint(mintArgs);
    }).toThrow();

    // check total supply
    totalSupplyRes = tkn.total_supply();
    expect(totalSupplyRes.value).toBe(123);
  });

  it("should transfer tokens", () => {
    const tkn = new Token();

    MockVM.setCaller(
      new chain.caller_data(CONTRACT_ID, chain.privilege.user_mode)
    );

    // mint tokens
    const mintArgs = new token.mint_args(CONTRACT_ID, 123);
    tkn.callArgs = new System.getArgumentsReturn();
    tkn.callArgs!.args = Protobuf.encode(mintArgs, token.mint_args.encode);
    tkn.mint(mintArgs);

    // transfer tokens
    const transferArgs = new token.transfer_args(CONTRACT_ID, MOCK_ACCT2, 10);
    tkn.callArgs = new System.getArgumentsReturn();
    tkn.callArgs!.args = Protobuf.encode(
      transferArgs,
      token.transfer_args.encode
    );
    tkn.transfer(transferArgs);

    // check balances
    let balanceArgs = new token.balance_of_args(CONTRACT_ID);
    let balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    balanceArgs = new token.balance_of_args(MOCK_ACCT2);
    balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(10);

    // check events
    const events = MockVM.getEvents();
    // 2 events, 1st one is the mint event, the second one is the transfer event
    expect(events.length).toBe(2);
    expect(events[1].name).toBe("token.transfer_event");
    expect(events[1].impacted.length).toBe(2);
    expect(Arrays.equal(events[1].impacted[0], MOCK_ACCT2)).toBe(true);
    expect(Arrays.equal(events[1].impacted[1], CONTRACT_ID)).toBe(true);

    const transferEvent = Protobuf.decode<token.transfer_args>(
      events[1].data!,
      token.transfer_args.decode
    );
    expect(Arrays.equal(transferEvent.from, CONTRACT_ID)).toBe(true);
    expect(Arrays.equal(transferEvent.to, MOCK_ACCT2)).toBe(true);
    expect(transferEvent.value).toBe(10);
  });

  it("should not transfer tokens without the proper authorizations", () => {
    const tkn = new Token();

    MockVM.setCaller(
      new chain.caller_data(CONTRACT_ID, chain.privilege.user_mode)
    );

    // mint tokens
    const mintArgs = new token.mint_args(MOCK_ACCT1, 123);
    tkn.callArgs = new System.getArgumentsReturn();
    tkn.callArgs!.args = Protobuf.encode(mintArgs, token.mint_args.encode);
    tkn.mint(mintArgs);

    // save the MockVM state because the transfer is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      // try to transfer tokens without the proper authorizations for MOCK_ACCT1
      const tkn = new Token();
      const transferArgs = new token.transfer_args(MOCK_ACCT1, MOCK_ACCT2, 10);
      tkn.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new token.balance_of_args(MOCK_ACCT1);
    let balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    balanceArgs = new token.balance_of_args(MOCK_ACCT2);
    balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);
  });

  it("should be able to transfer tokens to self", () => {
    const tkn = new Token();

    MockVM.setCaller(
      new chain.caller_data(CONTRACT_ID, chain.privilege.user_mode)
    );

    // mint tokens
    const mintArgs = new token.mint_args(CONTRACT_ID, 123);
    tkn.callArgs = new System.getArgumentsReturn();
    tkn.callArgs!.args = Protobuf.encode(mintArgs, token.mint_args.encode);
    tkn.mint(mintArgs);

    // try to transfer tokens
    const transferArgs = new token.transfer_args(CONTRACT_ID, CONTRACT_ID, 10);
    tkn.transfer(transferArgs);

    // check balances
    let balanceArgs = new token.balance_of_args(CONTRACT_ID);
    let balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);
  });

  it("should not transfer if insufficient balance", () => {
    const tkn = new Token();

    MockVM.setCaller(
      new chain.caller_data(CONTRACT_ID, chain.privilege.user_mode)
    );

    // mint tokens
    const mintArgs = new token.mint_args(CONTRACT_ID, 123);
    tkn.callArgs = new System.getArgumentsReturn();
    tkn.callArgs!.args = Protobuf.encode(mintArgs, token.mint_args.encode);
    tkn.mint(mintArgs);

    MockVM.commitTransaction();

    // try to transfer tokens
    expect(() => {
      const tkn = new Token();
      const transferArgs = new token.transfer_args(
        CONTRACT_ID,
        MOCK_ACCT2,
        456
      );
      tkn.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new token.balance_of_args(CONTRACT_ID);
    let balanceRes = tkn.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);
  });
});
