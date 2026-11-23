"use strict";

const http = require("node:http");
const {readFileSync} = require("node:fs");
const path = require("node:path");
const {minimize, equivalent, run} = require("./engine");
const {compile} = require("./regex");

function validateNames(names, max) {
  if (!Array.isArray(names) || !names.length || names.length > max || new Set(names).size !== names.length ||
      names.some(name => typeof name !== "string" || !name || /[\s,]/u.test(name))) {
    throw new Error("Use 1–" + max + " distinct nonempty names without whitespace or commas.");
  }
}
function validateMachine(machine) {
  if (!machine || typeof machine !== "object") throw new Error("Provide a DFA.");
  const {states, alphabet, start, finals, rows} = machine;
  validateNames(states, 30);
  validateNames(alphabet, 12);
  const isState = id => Number.isInteger(id) && id >= 0 && id < states.length;
  if (!isState(start) || !Array.isArray(finals) || !finals.every(isState) ||
      !Array.isArray(rows) || rows.length !== states.length ||
      rows.some(row => !Array.isArray(row) || row.length !== alphabet.length || !row.every(isState))) {
    throw new Error("Provide a start state, valid accepting states, and one destination per state and symbol.");
  }
}
const handlers = {
  "/api/compile": ({expression, alphabet}) => {
    validateNames(alphabet, 12);
    return {machine:compile(expression, alphabet)};
  },
  "/api/minimize": machine => {
    validateMachine(machine);
    const result = minimize(machine);
    return {...result, equivalent:equivalent(machine, result.reduced)};
  },
  "/api/compare": ({original, reduced, symbols}) => {
    validateMachine(original);
    validateMachine(reduced);
    if (!Array.isArray(symbols) || symbols.length > 1000 ||
        symbols.some(symbol => !original.alphabet.includes(symbol) || !reduced.alphabet.includes(symbol))) {
      throw new Error("Use up to 1,000 symbols from the DFA alphabet.");
    }
    return {runs:[run(original, symbols), run(reduced, symbols)]};
  }
};
const html = readFileSync(path.join(__dirname, "index.html"));
function json(response, status, data) {
  response.writeHead(status, {"Content-Type":"application/json; charset=utf-8"});
  response.end(JSON.stringify(data));
}
async function serve(request, response) {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
    response.end(html);
    return;
  }
  if (request.method !== "POST" || !Object.hasOwn(handlers, request.url)) {
    json(response, 404, {error:"Route not found."});
    return;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request.iterator({destroyOnReturn:false})) {
      size += chunk.length;
      if (size > 65536) {
        json(response, 413, {error:"Request is too large."});
        return;
      }
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Send a JSON object.");
    json(response, 200, handlers[request.url](payload));
  } catch (error) {
    json(response, 400, {error:error instanceof SyntaxError ? "Send valid JSON." : error.message});
  }
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.DFA_HOST ?? (process.env.RENDER === "true" ? "0.0.0.0" : "127.0.0.1");
  http.createServer(serve).listen(port, host, () => console.log("DFA Studio is running at http://" + host + ":" + port));
}

module.exports = {serve};
