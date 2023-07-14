import { System } from "@koinos/sdk-as";

describe("wordeth", () => {
  it("should work", () => {
    const x = new Date(1687910400000);
    const y = Date.UTC(2023,5,28,0,0,0,0);
    System.log(`expected 1687910400000`);
    System.log(`received ${y}`);
  });
});