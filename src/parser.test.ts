import { Parser } from "./parser";

describe("Parser", () => {
  describe("parsing", () => {
    it("Well-formed query, ending with number", () => {
      expect(Parser.parse("(= x 0)")).not.toBeNull();
    });

    it("Well-formed query, ending with keyword", () => {
      expect(Parser.parse("(= x true)")).not.toBeNull();
      expect(Parser.parse("(= x false)")).not.toBeNull();
      expect(Parser.parse("(= x null)")).not.toBeNull();
    });

    it("Well-formed query, ending with string", () => {
      expect(Parser.parse('(= x "foo")')).not.toBeNull();
    });

    it("Well-formed query, ending with identifier", () => {
      expect(Parser.parse('(= "foo" x)')).not.toBeNull();
    });

    it("Multi line query", () => {
      const query =
        `(and
         (> x 0)
         (< y 0))`;
      expect(Parser.parse(query)).not.toBeNull();
    });

    // TODO Assert good error messages
    it("Missing closing parentheses", () => {
      expect(() => Parser.parse("(= x 0")).toThrow("Missing closing parenthesis");
    });

    it("Missing opening parentheses", () => {
      expect(() => Parser.parse("= x 0)")).toThrow("Missing opening parenthesis");
      expect(() => Parser.parse("(= x 0))")).toThrow("Missing opening parenthesis");
    });

    it("Empty expression", () => {
      expect(() => Parser.parse("()")).toThrow("Expected name, got ')'");
    });

    it("Expression starting with a number", () => {
      expect(() => Parser.parse("(1 2 3 4)")).toThrow("Expected name, got '1'");
    });

    it("Expression starting with a string", () => {
      expect(() => Parser.parse('("foo" 2 3 4)')).toThrow("Expected name, got '\"foo\"'");
    });

    it("Expression starting with a keyword", () => {
      expect(() => Parser.parse('(true 2 3 4)')).toThrow("Expected name, got 'true'");
    });
  });

  describe("evaluation", () => {
    it("Simple query", () => {
      const positiveX = { x: 1, y: 99 };
      const negativeX = { x: -1, y: 99 };

      const expression = Parser.parse("(> x 0)");
      expect(expression.evaluate(positiveX)).toBe(true);
      expect(expression.evaluate(negativeX)).toBe(false);
    });

    it("Nested query", () => {
      const positive = { x: 1, y: 99 };
      const negative = { x: -1, y: -99 };

      const expression = Parser.parse("(and (> x 0) (not (< y 0)))");
      expect(expression.evaluate(positive)).toBe(true);
      expect(expression.evaluate(negative)).toBe(false);
    });

    it("Non-boolean results", () => {
      expect(() => Parser.parse('(and (> x 0) "foo")').evaluate({ a: 1 })).toThrow("Logical expressions must evaluate to boolean");
      expect(() => Parser.parse('(or (> x 0) "foo")').evaluate({ a: 1 })).toThrow("Logical expressions must evaluate to boolean");
      expect(() => Parser.parse('(not "foo")').evaluate({ a: 1 })).toThrow("Logical expressions must evaluate to boolean");
    });

    it("Comparing more than two values", () => {
      expect(() => Parser.parse('(> a 0 1)').evaluate({ a: 1 })).toThrow("Comparisons should have only 2 terms");
    });

    it("Method call", () => {
      const expression = Parser.parse('(includes name "Doe")');
      expect(expression.evaluate({ name: "John Doe" })).toBe(true);
    });

    it("aasdasdasd", () => {
      const expression = Parser.parse('(substring name 1 4)');
      expect(expression.evaluate({ name: "Schumpeter" })).toBe("chu");
    });

    it("Complex query", () => {
      const expression = Parser.parse(`
        (not
          (or
          (and
            (startsWith name "E")
            (startsWith surname "M")
            (= gender "K"))
          (endsWith email ".com")
          (not (= age 32))))       
      `);

      const user = {
        "id": 0,
        "name": "Esmiye", 
        "surname": "Tefekk\u00fcl", 
        "email": "esmiye@tefekk\u00fcl.com", 
        "username": "tefekk\u00fcl_esmiye", 
        "gender": "K",
        "age": 32
      };

      expect(expression.evaluate(user)).toBe(false);
    })
  });
});
