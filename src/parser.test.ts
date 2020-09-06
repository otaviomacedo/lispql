import { Lexer, Parser } from "./parser";

describe("Parser", () => {
  describe("parsing", () => {
    it("Well-formed query", () => {
      expect(Parser.parse("(= x 0)")).not.toBeNull();
    });
  
    // TODO Assert good error messages
    it("Missing closing parentheses", () => {
      expect(() => Parser.parse("(= x 0")).toThrow();
    });
  
    it("Missing opening parentheses", () => {
      expect(() => Parser.parse("= x 0)")).toThrow();
    });
  
    it("Expression starting with a number", () => {
      expect(() => Parser.parse("(1 2 3 4)")).toThrow();
    });
  
    it("Expression starting with a string", () => {
      expect(() => Parser.parse('("foo" 2 3 4)')).toThrow();
    });
  
    it("Expression starting with a keyword", () => {
      expect(() => Parser.parse('(true 2 3 4)')).toThrow();
    });  
  });

  describe("evaluation", () => {
    it("Simple query", () => {
      const positiveX = {x: 1, y: 99};
      const negativeX = {x: -1, y: 99};

      const expression = Parser.parse("(> x 0)");
      expect(expression.evaluate(positiveX)).toBe(true);
      expect(expression.evaluate(negativeX)).toBe(false);
    });

    it("Nested query", () => {
      const positive = {x: 1, y: 99};
      const negative = {x: -1, y: -99};

      const expression = Parser.parse("(and (> x 0) (not (< y 0)))");
      expect(expression.evaluate(positive)).toBe(true);
      expect(expression.evaluate(negative)).toBe(false);
    });

    it("Non-boolean results", () => {
      expect(() => Parser.parse('(and (> x 0) "foo")').evaluate({a: 1})).toThrow();
      expect(() => Parser.parse('(or (> x 0) "foo")').evaluate({a: 1})).toThrow();
      expect(() => Parser.parse('(not "foo")').evaluate({a: 1})).toThrow();
    });

    it("Comparing more than two values", () => {
      expect(() => Parser.parse('(> a 0 1)').evaluate({a: 1})).toThrow();
    });
  });  
});
