interface Expression {
    evaluate(obj?: any): any;
}

class Expressions {
    static create(head: Token, params?: Expression[]): Expression {
        const value = head.value;

        if (head.type === TokenType.IDENTIFIER) {
            if (["=", ">", "<", ">=", "<=", "!="].includes(value)) {
                return Comparison.create(value, params);
            } else if (value === "and") {
                return new Conjunction(params);
            } else if (value === "or") {
                return new Disjunction(params);
            } else if (value === "not") {
                return new Negation(params);
            } else if (params == null || params.length === 0) {
                return new Variable(value);
            } else {
                // Assuming that any identifier at the beginning of a list is a method call
                return new MethodCall(value, params);
            }
        } else {
            return new Constant(JSON.parse(value));
        }
    }
}

class Comparison implements Expression {
    private readonly operator: (a: any, b: any) => boolean;

    constructor(private readonly str: string, private readonly terms: Expression[]) {
        if (terms.length !== 2) {
            throw new Error(`Comparisons should have only 2 terms`);
        }

        this.operator = Comparison.operators[str]; 
    }

    private static operators = {
        "=": (a: any, b: any) => a === b,
        ">": (a: any, b: any) => a > b,
        "<": (a: any, b: any) => a < b,
        ">=": (a: any, b: any) => a >= b,
        "<=": (a: any, b: any) => a <= b,
        "!=": (a: any, b: any) => a !== b,
    };

    static create(identifier: string, terms: Expression[]) {
        if (Comparison.operators[identifier] != null) {
            return new Comparison(identifier, terms);
        } else {
            throw new Error(`Unknown operator ${identifier}`)
        }
    }

    evaluate(obj: any) {
        const result = this.operator(this.terms[0].evaluate(obj), this.terms[1].evaluate(obj));
        return result;
    }
}

class MethodCall implements Expression {
    constructor(private readonly name: string, private readonly terms: Expression[]) {}

    evaluate(obj?: any) {
        const target = this.terms[0].evaluate(obj);
        return target[this.name].apply(target, this.terms.slice(1).map(t => t.evaluate(obj)));
    }
}

class Conjunction implements Expression {
    constructor(private readonly terms: Expression[]) {}

    evaluate(obj?: any) {
        const evaluated = this.terms.map(term => term.evaluate(obj));
        if (evaluated.every(v => typeof v === 'boolean')) {
            return evaluated.reduce((a, b) => a && b);
        } else {
            // TODO Better error message
            throw new Error("Logical expressions must evaluate to boolean")
        }
    }
}

class Disjunction implements Expression {
    constructor(private readonly terms: Expression[]) {}

    evaluate(obj?: any) {
        const evaluated = this.terms.map(term => term.evaluate(obj));
        if (evaluated.every(v => typeof v === 'boolean')) {
            return evaluated.reduce((a, b) => a || b);
        } else {
            // TODO Better error message
            throw new Error("Logical expressions must evaluate to boolean")
        }
    }
}

class Negation implements Expression {
    constructor(private readonly terms: Expression[]) {}

    evaluate(obj?: any) {
        const a = this.terms[0].evaluate(obj);
        
        if (typeof a === 'boolean') {
            return !a;
        } else {
            // TODO Better error message
            throw new Error("Logical expressions must evaluate to boolean");
        }
    }
}

class Constant implements Expression {
    constructor(private readonly value: any) {}

    evaluate(obj?: any) {
        return this.value;
    }
}

class Variable implements Expression {
    constructor(private readonly name: string) {}
    
    evaluate(obj: any) {
        return obj[this.name];
    }
}

enum TokenType {
    OPEN_PARENTHESIS = "(",
    CLOSE_PARENTHESIS = ")",
    IDENTIFIER = "ID",
    STRING = "ST",
    NUMBER = "NU",
    KEYWORD = "KW"
}

interface Token {
    type: TokenType;
    value?: string;
}

class Lexer {
    private static MATCHERS = [
        {
            type: TokenType.OPEN_PARENTHESIS,
            regex: /^\(/
        },
        {
            type: TokenType.CLOSE_PARENTHESIS,
            regex: /^\)/
        },
        {
            type: TokenType.STRING,
            regex: /^".*"/
        },
        {
            type: TokenType.KEYWORD,
            regex: /^(true|false|null)/
        },
        {
            type: TokenType.NUMBER,
            regex: /^\d+/
        },
        {
            type: TokenType.IDENTIFIER,
            regex: /\S+(?<![\)\(])/
        }
    ];
    private _currentToken: Token;

    constructor(private query: string){
        this.moveForward();
    } 

    private nextToken(): Token {
        const q = this.query;
        this.query = this.query.trim();

        let result: Token;
        for (const matcher of Lexer.MATCHERS) {
            const match = this.query.match(matcher.regex);
            if (match != null) {
                this.query = this.query.substring(match[0].length);
                result = {
                    type: matcher.type,
                    value: match[0]
                }
                break;
            }
        }

        return result;
    }

    moveForward() {
        if (this.hasNext()) {
            this._currentToken = this.nextToken();
        } else {
            throw new Error("Missing closing parenthesis");
        }
    }

    get currentToken(): Token {
        return this._currentToken;
    }

    hasNext(): boolean {
        return this.query.length > 0;
    }
}

export class Parser {
    static parse(input: string): Expression {
        const lexer = new Lexer(input);
        const wrapper = new Wrapper(lexer)
        const result = wrapper.parseExpression();

        if (lexer.hasNext()) {
            throw new Error("Missing opening parenthesis");
        }
        return result;
    }
}

class Wrapper {
    private level = 0;
    constructor(private readonly lexer: Lexer) {}

    parseExpressions() : Expression[] {
        const result: Expression[] = [];

        while (this.lexer.hasNext()) {
            result.push(this.parseExpression());
        }

        return result;
    }

    parseExpression(): Expression {
        let token = this.lexer.currentToken;

        if (token.type === TokenType.IDENTIFIER || 
            token.type === TokenType.STRING || 
            token.type === TokenType.KEYWORD ||
            token.type === TokenType.NUMBER) {
            
            if (this.level < 1) {
                throw new Error("Missing opening parenthesis");
            }
            return Expressions.create(token);
        } 
        else if (token.type === TokenType.OPEN_PARENTHESIS) {
            this.level++;

            this.lexer.moveForward();
            const head = this.lexer.currentToken;

            if (head.type !== TokenType.IDENTIFIER) {
                throw new Error(`Expected name, got '${head.value}'`);
            }
            const terms: Expression[] = [];
            this.lexer.moveForward();

            while (this.lexer.currentToken.type !== TokenType.CLOSE_PARENTHESIS) {
                terms.push(this.parseExpression());
                this.lexer.moveForward();
            }

            this.level--;
            return Expressions.create(head, terms);
        } 
        else {
            throw new Error("Invalid expression");
        }
    }
}   