import { Hello } from "../Hello";

describe("hello", () => {
  it("should say hello", () => {
    const h = new Hello();
    const res = h.say_hello();
    expect(res.value).toBe("Hello World 🚀");
  });
});
