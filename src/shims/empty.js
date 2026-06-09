// Empty module shim for the native (Hermes) bundle — stands in for node builtins
// (readline / tty / worker_threads) and the `web-worker` package that the prover
// chain requires at load time but never exercises on the single-threaded,
// URL-loading proving path used on a phone. Aliased in metro.config.js for native.
const empty = {};
empty.default = empty;

module.exports = empty;
