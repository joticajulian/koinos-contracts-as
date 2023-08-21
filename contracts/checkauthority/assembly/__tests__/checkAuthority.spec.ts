import {
  Base58,
  MockVM,
  Arrays,
  Protobuf,
  authority,
  chain,
  System,
  system_calls,
  Base64,
  protocol,
} from "@koinos/sdk-as";
import { CheckAuthority } from "../CheckAuthority";
import { checkauthority } from "../proto/checkauthority";

const gameX = Base58.decode("1KiRLeP1oLgdebBzMwWucsKSGVjDboy6ZC");
const tokenContract = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");
const entryPoint: u32 = 0;
const data = new Uint8Array(0);

const account = Base58.decode("1z629tURV9KAK6Q5yqFDozwSHeWshxXQe");
const txId = Arrays.fromHexString(
  "1220a08183a5237e57a08e1ae539017c4253ddfbc23f9b7b6f5e263669aacd3fed47"
);
const signature = Base64.decode(
  "IF5FBloKjEfnqlGJRL_aPy4L36On-Q8XXzpAQagK_X-xZ6DgioBhZOhKEnhKyhaoROAgGwRuy6BsdRqya8fCHU8="
);

const account2 = Base58.decode("14Saxwv2hbzYr9omru9tZq4xjJGM2AhGgm");
describe("Check Authority", () => {
  beforeEach(() => {
    MockVM.reset();
  });

  it("should accept when the caller is the user", () => {
    const args = new checkauthority.checkauthority_args(
      account,
      checkauthority.authorization_type.contract_call,
      account,
      entryPoint,
      data
    );
    const result = new CheckAuthority().check_authority(args);
    expect(result.value).toBe(true);
  });

  it("should accept when the smart wallet of the user accepts", () => {
    // define a contract for the user and mock the result
    new CheckAuthority().contractMetadata.put(
      account,
      new chain.contract_metadata_object(
        new Uint8Array(32),
        false,
        true,
        false,
        false
      )
    );
    MockVM.setCallContractResults([
      new system_calls.exit_arguments(
        0,
        new chain.result(
          Protobuf.encode(
            new authority.authorize_result(true),
            authority.authorize_result.encode
          )
        )
      ),
    ]);
    MockVM.setCaller(
      new chain.caller_data(tokenContract, chain.privilege.user_mode)
    );

    const args = new checkauthority.checkauthority_args(
      account,
      checkauthority.authorization_type.contract_call,
      gameX,
      entryPoint,
      data
    );
    const result = new CheckAuthority().check_authority(args);
    expect(result.value).toBe(true);
  });

  it("should reject when the smart wallet of the user rejects", () => {
    // define a contract for the user and mock the result
    new CheckAuthority().contractMetadata.put(
      account,
      new chain.contract_metadata_object(
        new Uint8Array(32),
        false,
        true,
        false,
        false
      )
    );
    MockVM.setCallContractResults([
      new system_calls.exit_arguments(
        0,
        new chain.result(
          Protobuf.encode(
            new authority.authorize_result(false),
            authority.authorize_result.encode
          )
        )
      ),
    ]);
    MockVM.setCaller(
      new chain.caller_data(tokenContract, chain.privilege.user_mode)
    );

    const args = new checkauthority.checkauthority_args(
      account,
      checkauthority.authorization_type.contract_call,
      gameX,
      entryPoint,
      data
    );
    const result = new CheckAuthority().check_authority(args);
    expect(result.value).toBe(false);
  });

  it("should accept when the user signs the transaction", () => {
    const tx = new protocol.transaction(
      txId,
      new protocol.transaction_header(),
      [],
      [signature]
    );
    MockVM.setTransaction(tx);

    const args = new checkauthority.checkauthority_args(
      account,
      checkauthority.authorization_type.contract_call,
      null, // no caller
      entryPoint,
      data
    );
    const result = new CheckAuthority().check_authority(args);
    expect(result.value).toBe(true);
  });

  it("should reject when there is a caller even if the user has signed the transaction", () => {
    const tx = new protocol.transaction(
      txId,
      new protocol.transaction_header(),
      [],
      [signature]
    );
    MockVM.setTransaction(tx);

    const args = new checkauthority.checkauthority_args(
      account,
      checkauthority.authorization_type.contract_call,
      gameX, // there is a caller which is not the account
      entryPoint,
      data
    );
    const result = new CheckAuthority().check_authority(args);
    expect(result.value).toBe(false);
  });

  it("should reject when the user has not signed the transaction", () => {
    const tx = new protocol.transaction(
      txId,
      new protocol.transaction_header(),
      [],
      [signature]
    );
    MockVM.setTransaction(tx);

    const args = new checkauthority.checkauthority_args(
      account2, // a different account to invalidate the signature
      checkauthority.authorization_type.contract_call,
      null, // no caller
      entryPoint,
      data
    );
    const result = new CheckAuthority().check_authority(args);
    expect(result.value).toBe(false);
  });
});
