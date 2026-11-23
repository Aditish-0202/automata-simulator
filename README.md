# DFA Studio

CSET302 Milestone II · Aditi Sharma

## Run on your computer

Extract the ZIP. Open a terminal inside the extracted `dfa-studio` folder and run `node server.js` with Node.js 22 or later. Open http://localhost:3000 in your browser. No packages or API keys are needed.

## Enter a language

Set the alphabet field and enter a formal regular expression. Use `|` for union, adjacent terms for concatenation, `*` for zero or more repetitions, parentheses for grouping, `ε` for the empty string, and `∅` for the empty language. Regex mode uses single-character alphabet symbols. The manual DFA editor also supports multi-character symbols.

| Language over 0, 1 | Expression | Minimized states |
|---|---|---:|
| Ends in 1 | `(0\|1)*1` | 2 |
| Contains 01 | `(0\|1)*01(0\|1)*` | 3 |
| Has an even number of 1s | `0*(10*10*)*` | 2 |
| Contains only the empty string | `ε` | 2 |
| Empty language | `∅` | 1 |

For the last two cases, leave the test input blank to test ε. For malformed input, try `(0|1`.

## Processing

The backend parses the expression, creates an epsilon-NFA with Thompson construction, and builds a complete DFA with subset construction. Minimization removes unreachable states and refines the accepting/nonaccepting partition until stable. The original and minimized languages are compared by visiting reachable pairs of states and checking for any disagreement on acceptance.

The application handles regular languages represented by the supported regex syntax or a complete DFA. Expressions generating more than 30 DFA states are rejected to keep the transition editor manageable.
