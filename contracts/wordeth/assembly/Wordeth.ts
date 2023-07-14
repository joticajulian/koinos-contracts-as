import {
  Arrays,
  System,
  authority,
  Storage,
  Protobuf,
  Base58,
  StringBytes,
  value,
  chain,
  Crypto,
} from "@koinos/sdk-as";
import { wordeth } from "./proto/wordeth";
import { common } from "./proto/common";

export class Wordeth {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array;
  
  supply: Storage.Obj<token.uint64>;
  balances: Storage.Map<Uint8Array, token.uint64>;
  allowances: Storage.Map<Uint8Array, token.uint64>;
  userContracts: Storage.Map<Uint8Array, token.boole>;

  constructor() {
    
  }

  /**
   * Authorize function
   * @external
   */
  authorize(args: authority.authorize_arguments): authority.authorize_result {
    if (args.type == authority.authorization_type.contract_call) {

    }
  }

  verifyEthSignature(message: string, signature: Uint8Array):void {
    const signedMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
    let multihashBytes = System.hash(Crypto.multicodec.keccak_256, StringBytes.stringToBytes(signedMessage));
    const publicKey = System.recoverPublicKey(signature, multihashBytes!, chain.dsa.ecdsa_secp256k1, false);
    multihashBytes = System.hash(Crypto.multicodec.keccak_256, publicKey!.subarray(1));
    let mh = new Crypto.Multihash();
    mh.deserialize(multihashBytes!);
    System.require(Arrays.equal(mh.digest.subarray(-20), eth_address), "invalid signature");
  }

  /**
   * @external
   */
  call(args: wordeth.call_args): void {
    System.require(args.command.length > 0, "empty command");
    System.require(args.signature, "empty signature");
    this.verifyEthSignature(args.command, args.signature);

    const cParts = args.command.split(" ");
    System.require(cParts.length >= 3, `invalid command: Only ${cParts.length} parts`);
    const time = cParts[0];
    const contractName = cParts[1];
    const entryPointName = cParts[2];
    const textArgs = args.command.slice(cParts[0].length + cParts[1].length + cParts[2].length + 2);
    
    const now = System.getHeadInfo().head_block_time;
    this.verifyNonce(time);
  }
}
