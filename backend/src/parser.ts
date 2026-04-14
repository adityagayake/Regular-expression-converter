// parser.ts - Regex parser with infix to postfix conversion

export class RegexParser {
  private static readonly OPERATORS = new Set(['|', '*', '(', ')']);
  private static readonly PRECEDENCE: { [key: string]: number } = {
    '|': 1,
    '.': 2,
    '*': 3,
  };
  private static readonly ASSOCIATIVITY: { [key: string]: 'left' | 'right' } = {
    '|': 'left',
    '.': 'left',
    '*': 'right',
  };

  static parse(regex: string): string[] {
    if (!regex || regex.trim() === '') {
      throw new Error('Empty regex');
    }

    const tokens = this.tokenize(regex);
    console.log('Explicit regex:', tokens.join(' '));
    const postfix = this.toPostfix(tokens);
    console.log('Postfix expression:', postfix.join(' '));
    return postfix;
  }

  private static tokenize(regex: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < regex.length) {
      const char = regex[i];

      if (this.OPERATORS.has(char)) {
        tokens.push(char);
        i++;
      } else if (char === ' ') {
        i++; // skip spaces
      } else {
        // symbol (letter, digit, etc.)
        tokens.push(char);
        i++;
      }
    }

    return this.addConcatenation(tokens);
  }

  private static addConcatenation(tokens: string[]): string[] {
    const result: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      result.push(tokens[i]);

      if (i < tokens.length - 1) {
        const current = tokens[i];
        const next = tokens[i + 1];

        // Add '.' if concatenation is needed
        if (
          (!this.isOperator(current) && !this.isOperator(next)) ||
          (!this.isOperator(current) && next === '(') ||
          (current === ')' && !this.isOperator(next)) ||
          (current === ')' && next === '(') ||
          (current === '*' && !this.isOperator(next)) ||
          (current === '*' && next === '(')
        ) {
          result.push('.');
        }
      }
    }

    return result;
  }

  private static isOperator(token: string): boolean {
    return this.OPERATORS.has(token) || token === '.';
  }

  private static toPostfix(tokens: string[]): string[] {
    const output: string[] = [];
    const operators: string[] = [];

    for (const token of tokens) {
      if (!this.isOperator(token)) {
        // Pop '*' operators before pushing the symbol
        while (operators.length > 0 && operators[operators.length - 1] === '*') {
          output.push(operators.pop()!);
        }
        output.push(token);
      } else if (token === '(') {
        operators.push(token);
      } else if (token === ')') {
        while (operators.length > 0 && operators[operators.length - 1] !== '(') {
          output.push(operators.pop()!);
        }
        if (operators.length === 0) {
          throw new Error('Mismatched parentheses');
        }
        operators.pop(); // remove '('
      } else {
        // operator
        while (
          operators.length > 0 &&
          operators[operators.length - 1] !== '(' &&
          this.shouldPopOperator(operators[operators.length - 1], token)
        ) {
          output.push(operators.pop()!);
        }
        operators.push(token);
      }
    }

    while (operators.length > 0) {
      const op = operators.pop()!;
      if (op === '(') {
        throw new Error('Mismatched parentheses');
      }
      output.push(op);
    }

    return output;
  }

  private static shouldPopOperator(top: string, current: string): boolean {
    const topPrec = this.PRECEDENCE[top];
    const currPrec = this.PRECEDENCE[current];

    if (topPrec > currPrec) {
      return true;
    } else if (topPrec === currPrec) {
      return this.ASSOCIATIVITY[top] === 'left';
    }
    return false;
  }
}