"use strict";
function minimize(machine) {
  const {states, alphabet, rows, start, finals} = machine;
  const reachable = new Set([start]);
  // Set iteration also visits newly inserted states, implementing a BFS queue.
  for (const state of reachable) {
    for (const target of rows[state]) reachable.add(target);
  }
  const live = states.map((_, id) => id).filter(id => reachable.has(id));
  const removed = states.map((_, id) => id).filter(id => !reachable.has(id));
  const steps = [{title:"Reachability", groups:[live], removed}];
  const accepting = new Set(finals);
  let groups = [live.filter(id => !accepting.has(id)), live.filter(id => accepting.has(id))].filter(group => group.length);
  steps.push({title:"Separate accepting and non-accepting states", groups});
  const groupIndex = partition => new Map(partition.flatMap((group, index) => group.map(id => [id, index])));
  while (true) {
    const index = groupIndex(groups);
    const splits = groups.map(group => {
      const buckets = new Map();
      // States stay together when every symbol leads to the same prior block.
      for (const id of group) {
        const signature = rows[id].map(target => index.get(target)).join(",");
        if (!buckets.has(signature)) buckets.set(signature, []);
        buckets.get(signature).push(id);
      }
      return {group, buckets};
    });
    const next = splits.flatMap(({buckets}) => [...buckets.values()]);
    if (next.length === groups.length) {
      steps.push({title:"Stable partition", groups});
      break;
    }
    groups = next;
    steps.push({title:"Refine by transition targets", groups, splits:splits.filter(({buckets}) => buckets.size > 1).map(({group, buckets}) => ({group, buckets:[...buckets]}))});
  }
  const index = groupIndex(groups);
  const reduced = {
    states:groups.map((_, i) => "M" + i), alphabet,
    start:index.get(start),
    finals:groups.flatMap((group, i) => accepting.has(group[0]) ? [i] : []),
    rows:groups.map(group => rows[group[0]].map(target => index.get(target)))
  };
  return {steps, reduced, groups};
}

// Search reachable pairs. An acceptance mismatch witnesses different languages.
function equivalent(first, second) {
  const queue = [[first.start, second.start]];
  const seen = new Set([queue[0].join(",")]);
  for (const [a,b] of queue) {
    if (first.finals.includes(a) !== second.finals.includes(b)) return false;
    first.alphabet.forEach((_, k) => {
      const pair = [first.rows[a][k], second.rows[b][k]];
      const key = pair.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(pair);
      }
    });
  }
  return true;
}

function run(machine, symbols) {
  let state = machine.start;
  const path = [machine.states[state]];
  for (const symbol of symbols) {
    state = machine.rows[state][machine.alphabet.indexOf(symbol)];
    path.push("—" + symbol + "→", machine.states[state]);
  }
  return {path:path.join(" "), accepted:machine.finals.includes(state)};
}


module.exports = {minimize, equivalent, run};
