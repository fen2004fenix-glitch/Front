type Operator = '+' | '-' | '*' | '/';
// Общий тип для элементов токенов
type Elem = number | Operator | '(' | ')';

export function calc(expr: string): number {
  // raw — массив строк; затем клонируем через spread и приводим элементы к типу Elem
  const raw = expr.match(/-?\d+(\.\d+)?|[()+\-*/]/g) ?? [];
  const tokens: Elem[] = [...raw].map((t) => (isNumberString(t) ? Number(t) : (t as Elem)));

  let pos = 0;

  function parse(): number {
    if (pos >= tokens.length) {
      throw new Error('Unexpected end of input');
    }

    const token = tokens[pos++]!;

    if (isLeftParen(token)) {
      const value = parse();
      if (!isRightParen(tokens[pos++])) {
        throw new Error('Expected ")"');
      }
      return value;
    }

    if (isOperator(token)) {
      const op = token;
      // всегда парсим первый операнд
      const left = parse();

      // унарные + и -: если дальше ')' или нет токенов — это унарка
      if ((op === '+' || op === '-') && (pos >= tokens.length || isRightParen(tokens[pos]))) {
        return op === '+' ? +left : -left;
      }

      // иначе парсим второй операнд и возвращаем результат
      const right = parse();
      return compute(op, left, right);
    }

    if (isNumberElem(token)) {
      return token;
    }

    throw new Error(`Invalid token: ${String(token)}`);
  }

  const result = parse();
  if (pos < tokens.length) {
    throw new Error('Unexpected tokens remain');
  }
  return result;
}

/* Type guards */

// проверка строки-содержит-число (используется до преобразования в Elem)
function isNumberString(t: string): t is string {
  return /^-?\d+(\.\d+)?$/.test(t);
}

// Elem — число
function isNumberElem(t: unknown): t is number {
  return typeof t === 'number' && Number.isFinite(t);
}

// Elem — оператор
function isOperator(t: unknown): t is Operator {
  return typeof t === 'string' && (t === '+' || t === '-' || t === '*' || t === '/');
}

// левая скобка
function isLeftParen(t: unknown): t is '(' {
  return t === '(';
}

// правая скобка
function isRightParen(t: unknown): t is ')' {
  return t === ')';
}

function compute(op: Operator, a: number, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if (b === 0) throw new Error('Division by zero');
      return a / b;
  }
}

// Утилита для запуска из CLI
export function run(expr: string): void {
  try {
    console.log('Результат:', calc(expr));
  } catch {
    console.error('Error: неправильное выражение');
  }
}

// Тестовые примеры
run('+ 3 4'); // 7
run('*( - 5 6 ) 7'); // -7

// Примеры унарных операций
run('- 5'); // -5
run('+ 5'); //  5
run('(- 5)'); // -5
run('( + ( - 2 ) 3 )'); // 1

// Введён общий тип Elem = number | Operator | "(" | ")" для элементов токенов. 2

// Использован spread оператор [...raw] при создании массива токенов. 7

// Добавлены конкретные type guards: isNumberString, isNumberElem, isOperator, isLeftParen, isRightParen. 56
