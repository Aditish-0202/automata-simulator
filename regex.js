"use strict";

// Thompson construction followed by epsilon-closure subset construction.
function compile(expression, alphabet) {
  if (typeof expression !== "string" || expression.length > 240) {
    throw new Error("Enter a regular expression of at most 240 characters.");
  }
  if (alphabet.some(symbol => [...symbol].length !== 1 || "|*()ε∅".includes(symbol))) {
    throw new Error("Regex mode needs single-character alphabet symbols. Use the table editor for longer symbols.");
  }
  const tokens = [...expression].filter(token => !/\s/u.test(token));
  const edges = [];
  const state = () => edges.push([]) - 1;
  const link = (from, to, symbol = null) => edges[from].push({to, symbol});
  let cursor = 0;

  function atom() {
    const token = tokens[cursor++];
    if (token === "(") {
      const grouped = union();
      if (tokens[cursor++] !== ")") throw new Error("A closing parenthesis is missing.");
      return grouped;
    }
    if (token !== "ε" && token !== "∅" && !alphabet.includes(token)) {
      throw new Error(token === undefined ? "Expected an expression." : "Unexpected symbol: " + token);
    }
    const from = state(), to = state();
    if (token !== "∅") link(from, to, token === "ε" ? null : token);
    return [from, to];
  }
  function repetition() {
    let fragment = atom();
    while (tokens[cursor] === "*") {
      cursor++;
      const [entry, exit] = fragment;
      const from = state(), to = state();
      link(from, entry);
      link(from, to);
      link(exit, entry);
      link(exit, to);
      fragment = [from, to];
    }
    return fragment;
  }
  function concatenation() {
    const [start, firstEnd] = repetition();
    let end = firstEnd;
    while (cursor < tokens.length && tokens[cursor] !== "|" && tokens[cursor] !== ")") {
      const [next, nextEnd] = repetition();
      link(end, next);
      end = nextEnd;
    }
    return [start, end];
  }
  function union() {
    let fragment = concatenation();
    while (tokens[cursor] === "|") {
      cursor++;
      const right = concatenation();
      const from = state(), to = state();
      link(from, fragment[0]);
      link(from, right[0]);
      link(fragment[1], to);
      link(right[1], to);
      fragment = [from, to];
    }
    return fragment;
  }
  const [entry, exit] = union();
  if (cursor !== tokens.length) throw new Error("Unexpected closing parenthesis.");

  function closure(start) {
    const visited = new Set(start);
    for (const id of visited) {
      for (const edge of edges[id]) if (edge.symbol === null) visited.add(edge.to);
    }
    return [...visited].sort((a, b) => a - b);
  }

  const subsets = [];
  const byKey = new Map();
  function register(subset) {
    const key = subset.join(",");
    if (!byKey.has(key)) {
      if (subsets.length === 30) throw new Error("The expression generates more than 30 DFA states. Try a smaller expression.");
      byKey.set(key, subsets.push(subset) - 1);
    }
    return byKey.get(key);
  }
  register(closure([entry]));
  const rows = [], finals = [];
  for (const subset of subsets) {
    if (subset.includes(exit)) finals.push(rows.length);
    rows.push(alphabet.map(symbol => {
      const targets = subset.flatMap(id => edges[id].filter(edge => edge.symbol === symbol).map(edge => edge.to));
      // The empty subset is the dead state when an input has no NFA move.
      return register(closure(targets));
    }));
  }
  return {states:rows.map((_, i) => "D" + i), alphabet, start:0, finals, rows};
}

module.exports = {compile};
