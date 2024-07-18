// SPDX-License-Identifier: MIT
// Smart Wallet Allowance {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  Arrays,
  authority,
  Base58,
  Protobuf,
  Base64,
} from "@koinos/sdk-as";
import { System2, nft, token } from "@koinosbox/contracts";

import { smartwalletallowance } from "./proto/smartwalletallowance";

export class SmartWalletAllowance {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array = System.getContractId();

  allowances: Storage.Obj<smartwalletallowance.allowances> = new Storage.Obj(
    this.contractId,
    0,
    smartwalletallowance.allowances.decode,
    smartwalletallowance.allowances.encode,
    () => new smartwalletallowance.allowances(new Uint8Array(0), [])
  );

  /**
   * Set an allowance in user's contract
   * @external
   */
  set_allowance(args: smartwalletallowance.allowance): void {
    System.require(
      args.type != smartwalletallowance.allowance_type.undefined,
      "allowance type cannot be undefined"
    );
    const isAuthorized = System2.isSignedBy(this.contractId);
    if (!isAuthorized)
      System.fail(
        `not authorized by the wallet ${Base58.encode(this.contractId)}`
      );

    const txId = System.getTransactionField("id")!.bytes_value;
    const allowances = this.allowances.get()!;
    if (!Arrays.equal(txId, allowances.transaction_id)) {
      allowances.transaction_id = txId;
      allowances.allowances = [];
    }
    allowances.allowances.push(args);
  }

  /**
   * Authorize function
   * @external
   */
  authorize(args: authority.authorize_arguments): authority.authorize_result {
    if (args.type != authority.authorization_type.contract_call) {
      const isAuthorized = System2.isSignedBy(this.contractId);
      if (!isAuthorized) {
        System.fail(
          `${
            args.type == authority.authorization_type.contract_upload
              ? "contract upload"
              : "transaction application"
          } not authorized by the wallet ${Base58.encode(this.contractId)}`
        );
      }
      // In Koinos there are no contract factories, then the upload contract comes
      // always from an operation and it is safe to return true if the signature
      // is present in the transaction. The same for transaction application.
      // Once contract factories are supported in Koinos, the current logic in
      // the authorize function must be updated.
      return new authority.authorize_result(true);
    }

    const txId = System.getTransactionField("id")!.bytes_value;
    const allowances = this.allowances.get()!;
    if (
      !Arrays.equal(txId, allowances.transaction_id) ||
      allowances.allowances.length == 0
    ) {
      System.fail(
        `there are no allowances in the wallet ${Base58.encode(
          this.contractId
        )}`
      );
    }

    for (let i = 0; i < allowances.allowances.length; i += 1) {
      const allowance = allowances.allowances[i];
      if (
        Arrays.equal(allowance.contract_id, args.call!.contract_id) &&
        allowance.entry_point == args.call!.entry_point
      ) {
        if (
          allowance.caller &&
          !Arrays.equal(allowance.caller, args.call!.caller)
        ) {
          System.fail(
            `invalid caller to wallet ${Base58.encode(this.contractId)}`
          );
        }

        if (!allowance.data || allowance.data!.length == 0) {
          // remove allowance and accept
          allowances.allowances.splice(i, 1);
          this.allowances.put(allowances);
          return new authority.authorize_result(true);
        }

        if (!args.call!.data || args.call!.data.length == 0) {
          System.fail(
            `the wallet ${Base58.encode(
              this.contractId
            )} expects some data from the caller ${Base58.encode(
              args.call!.caller
            )} but it is empty`
          );
        }

        switch (allowance.type) {
          // Transfer Token
          //
          // The "value" in the allowance must the greater or equal to the requested one.
          // After the approval, this "value" is reduced accordingly. Then it is possible to
          // make multiple transfers with a single allowance.
          // "from" and "to" are optional values and are skipped if not defined. Otherwise
          // they are checked against the data in the request.
          // The "memo" is not checked.
          case smartwalletallowance.allowance_type.transfer_token: {
            const allowanceArgs = Protobuf.decode<token.transfer_args>(
              allowance.data!,
              token.transfer_args.decode
            );
            const transferArgs = Protobuf.decode<token.transfer_args>(
              args.call!.data,
              token.transfer_args.decode
            );
            if (
              allowanceArgs.from &&
              !Arrays.equal(allowanceArgs.from, transferArgs.from)
            ) {
              System.fail(
                `the wallet ${Base58.encode(
                  this.contractId
                )} expects a different "from" for token transfer`
              );
            }
            if (
              allowanceArgs.to &&
              !Arrays.equal(allowanceArgs.to, transferArgs.to)
            ) {
              System.fail(
                `the wallet ${Base58.encode(
                  this.contractId
                )} expects a different "to" for token transfer`
              );
            }
            if (allowanceArgs.value < transferArgs.value) {
              System.fail(
                `insufficient value to transfer. The allowance accepts up to ${allowanceArgs.value} but the request was ${transferArgs.value}`
              );
            }

            // update the available amount to transfer
            allowanceArgs.value -= transferArgs.value;
            if (allowanceArgs.value > 0) {
              allowances.allowances[i].data =
                Protobuf.encode<token.transfer_args>(
                  allowanceArgs,
                  token.transfer_args.encode
                );
            } else {
              // remove allowance
              allowances.allowances.splice(i, 1);
            }
            this.allowances.put(allowances);
            return new authority.authorize_result(true);
          }

          // Transfer NFT
          //
          // The "token_id" requested must match with the allowance.
          // "from" and "to" are optional values and are skipped if not defined. Otherwise
          // they are checked against the data in the request.
          // The "memo" is not checked.
          case smartwalletallowance.allowance_type.transfer_nft: {
            const allowanceArgs = Protobuf.decode<nft.transfer_args>(
              allowance.data!,
              nft.transfer_args.decode
            );
            const transferArgs = Protobuf.decode<nft.transfer_args>(
              args.call!.data,
              nft.transfer_args.decode
            );
            if (
              allowanceArgs.from &&
              !Arrays.equal(allowanceArgs.from, transferArgs.from)
            ) {
              System.fail(
                `the wallet ${Base58.encode(
                  this.contractId
                )} expects a different "from" for nft transfer`
              );
            }
            if (
              allowanceArgs.to &&
              !Arrays.equal(allowanceArgs.to, transferArgs.to)
            ) {
              System.fail(
                `the wallet ${Base58.encode(
                  this.contractId
                )} expects a different "to" for nft transfer`
              );
            }
            if (!Arrays.equal(allowanceArgs.token_id, transferArgs.token_id)) {
              System.fail(
                `the wallet ${Base58.encode(
                  this.contractId
                )} expects a different nft to transfer`
              );
            }

            // remove allowance
            allowances.allowances.splice(i, 1);
            this.allowances.put(allowances);
            return new authority.authorize_result(true);
          }

          // Mint Token
          //
          // The "value" in the allowance must the greater or equal to the requested one.
          // After the approval, this "value" is reduced accordingly. Then it is possible to
          // make multiple mints with a single allowance.
          // "to" is an optional value and is skipped if not defined. Otherwise it is
          // checked against the data in the request.
          case smartwalletallowance.allowance_type.mint_token: {
            const allowanceArgs = Protobuf.decode<token.mint_args>(
              allowance.data!,
              token.mint_args.decode
            );
            const mintArgs = Protobuf.decode<token.mint_args>(
              args.call!.data,
              token.mint_args.decode
            );
            if (
              allowanceArgs.to &&
              !Arrays.equal(allowanceArgs.to, mintArgs.to)
            ) {
              System.fail(
                `the wallet ${Base58.encode(
                  this.contractId
                )} expects a different "to" for token mint`
              );
            }
            if (allowanceArgs.value < mintArgs.value) {
              System.fail(
                `insufficient value to mint. The allowance accepts up to ${allowanceArgs.value} but the request was ${mintArgs.value}`
              );
            }

            // update the available amount to mint
            allowanceArgs.value -= mintArgs.value;
            if (allowanceArgs.value > 0) {
              allowances.allowances[i].data = Protobuf.encode<token.mint_args>(
                allowanceArgs,
                token.mint_args.encode
              );
            } else {
              // remove allowance
              allowances.allowances.splice(i, 1);
            }
            this.allowances.put(allowances);
            return new authority.authorize_result(true);
          }

          // Burn Token
          //
          // The "value" in the allowance must the greater or equal to the requested one.
          // After the approval, this "value" is reduced accordingly. Then it is possible to
          // make multiple burns with a single allowance.
          // "to" is an optional value and is skipped if not defined. Otherwise it is
          // checked against the data in the request.
          case smartwalletallowance.allowance_type.burn_token: {
            const allowanceArgs = Protobuf.decode<token.burn_args>(
              allowance.data!,
              token.burn_args.decode
            );
            const burnArgs = Protobuf.decode<token.burn_args>(
              args.call!.data,
              token.burn_args.decode
            );
            if (
              allowanceArgs.from &&
              !Arrays.equal(allowanceArgs.from, burnArgs.from)
            ) {
              System.fail(
                `the wallet ${Base58.encode(
                  this.contractId
                )} expects a different "from" for token burn`
              );
            }
            if (allowanceArgs.value < burnArgs.value) {
              System.fail(
                `insufficient value to burn. The allowance accepts up to ${allowanceArgs.value} but the request was ${burnArgs.value}`
              );
            }

            // update the available amount to burn
            allowanceArgs.value -= burnArgs.value;
            if (allowanceArgs.value > 0) {
              allowances.allowances[i].data = Protobuf.encode<token.burn_args>(
                allowanceArgs,
                token.burn_args.encode
              );
            } else {
              // remove allowance
              allowances.allowances.splice(i, 1);
            }
            this.allowances.put(allowances);
            return new authority.authorize_result(true);
          }

          // Other
          case smartwalletallowance.allowance_type.other: {
            if (!Arrays.equal(allowance.data!, args.call!.data)) {
              System.fail(
                `error wallet ${Base58.encode(
                  this.contractId
                )}: Allowance data ${Base64.encode(
                  allowance.data!
                )} does not match with requested data ${Base64.encode(
                  args.call!.data
                )}`
              );
            }
            // remove allowance and accept
            allowances.allowances.splice(i, 1);
            this.allowances.put(allowances);
            return new authority.authorize_result(true);
          }
        }
      }
    }

    System.fail(
      `no allowance set in wallet ${Base58.encode(
        this.contractId
      )} for contract ${Base58.encode(
        args.call!.contract_id
      )} and entry point ${args.call!.entry_point}`
    );

    return new authority.authorize_result(false);
  }
}
