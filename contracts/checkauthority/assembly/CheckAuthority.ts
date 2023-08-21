// SPDX-License-Identifier: MIT
// Check Authority Contract v0.0.0
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  Protobuf,
  Crypto,
  object_spaces,
  chain,
  authority,
  StringBytes,
  value,
  Arrays,
} from "@koinos/sdk-as";
import { checkauthority } from "./proto/checkauthority";

const KERNEL_ZONE = new Uint8Array(0);
const AUTHORIZE_ENTRYPOINT = 0x4a2dbd90;

export class CheckAuthority {
  callArgs: System.getArgumentsReturn | null;

  contractMetadata: Storage.Map<Uint8Array, chain.contract_metadata_object> =
    new Storage.Map(
      KERNEL_ZONE,
      object_spaces.system_space_id.contract_metadata,
      chain.contract_metadata_object.decode,
      chain.contract_metadata_object.encode,
      null,
      true
    );

  /**
   * Check authority
   * @external
   */
  check_authority(
    args: checkauthority.checkauthority_args
  ): authority.authorize_result {
    const contractMetadata = this.contractMetadata.get(args.account!);
    if (contractMetadata) {
      let authorizeOverride = false;
      switch (args.type) {
        case authority.authorization_type.contract_call: {
          authorizeOverride = contractMetadata.authorizes_call_contract;
          break;
        }
        case authority.authorization_type.transaction_application: {
          authorizeOverride =
            contractMetadata.authorizes_transaction_application;
          break;
        }
        case authority.authorization_type.contract_upload: {
          authorizeOverride = contractMetadata.authorizes_upload_contract;
          break;
        }
      }
      if (authorizeOverride) {
        // The call is sent to the authorize function of the account
        //
        // Example:
        // - Game_X calls Koin contract to make a transfer from Alice
        // - Koin contract calls CheckAuthority system call with
        //   these arguments:
        //     - account: Alice
        //     - type: contract_call
        //     - caller: Game_X
        //     - entry_point: transfer
        //     - data: {from: alice, to: ...}
        // - CheckAuthority calls the Alice's authorize function with
        //   these arguments:
        //     - type: contract_call
        //     - call_data:
        //       - contract_id: Koin contract
        //       - entry_point: transfer
        //       - caller: Game_X
        //       - data: {from: alice, to: ...}

        const argsBuffer = Protobuf.encode(
          new authority.authorize_arguments(
            args.type,
            new authority.call_data(
              System.getCaller().caller,
              args.entry_point,
              args.caller,
              args.data
            )
          ),
          authority.authorize_arguments.encode
        );
        const callRes = System.call(
          args.account!,
          AUTHORIZE_ENTRYPOINT,
          argsBuffer
        );
        if (callRes.code != 0) {
          const errorMessage = `failed to call authorize function: ${
            callRes.res.error && callRes.res.error!.message
              ? callRes.res.error!.message!
              : "unknown error"
          }`;
          System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
        }
        if (!callRes.res.object) {
          return new authority.authorize_result(false);
        }
        return Protobuf.decode<authority.authorize_result>(
          callRes.res.object!,
          authority.authorize_result.decode
        );
      }
    }

    if (args.caller && args.caller!.length > 0) {
      if (Arrays.equal(args.caller!, args.account!)) {
        return new authority.authorize_result(true);
      }

      // The caller is not allowed to speak in name of the user.
      //
      // If you want to allow callers to perform operations in name
      // of the user consider adding allowances to your contract
      return new authority.authorize_result(false);
    }

    // Check if the transaction was signed by the account
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const txId = System.getTransactionField("id")!.bytes_value!;

    for (let i = 0; i < signatures.values.length; i++) {
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value!,
        txId
      );
      const address = Crypto.addressFromPublicKey(publicKey!);
      if (Arrays.equal(args.account!, address)) {
        return new authority.authorize_result(true);
      }
    }

    return new authority.authorize_result(false);
  }
}
