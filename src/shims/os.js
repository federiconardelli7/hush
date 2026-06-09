// Minimal `os` shim for the native (Hermes) bundle. The snarkjs/ffjavascript prover
// chain reads os.cpus().length to size its worker pool; reporting a single CPU keeps
// it single-threaded (Hermes has no Worker), and nothing else in the proving path
// touches os. Aliased in metro.config.js for native only.
const cpus = () => [{ model: "", speed: 0, times: {} }];
const platform = () => "browser";

const shim = { cpus, platform };
shim.default = shim;

module.exports = shim;
