export function* combinations<T>(items: readonly T[], choose: number): Generator<T[]> {
  if (choose < 0 || choose > items.length) {
    return;
  }

  if (choose === 0) {
    yield [];
    return;
  }

  if (choose === items.length) {
    yield [...items];
    return;
  }

  for (let index = 0; index <= items.length - choose; index += 1) {
    const head = items[index];
    const tail = items.slice(index + 1);

    for (const remainder of combinations(tail, choose - 1)) {
      yield [head, ...remainder];
    }
  }
}

export function sampleWithoutReplacement<T>(
  items: readonly T[],
  count: number,
  random: () => number = Math.random,
) {
  if (count < 0 || count > items.length) {
    throw new Error(`Cannot sample ${count} values from ${items.length} items.`);
  }

  const pool = [...items];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, count);
}

export function compareScoreArrays(left: readonly number[], right: readonly number[]) {
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}