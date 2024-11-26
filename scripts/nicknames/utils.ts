import crypto from "crypto";

export function getTokenId(name: string): string {
  return `0x${Buffer.from(name).toString("hex")}`;
}

export function getEntryPoint(fnName: string): string {
  return `0x${crypto
    .createHash("sha256")
    .update(fnName)
    .digest("hex")
    .slice(0, 8)}`;
}
