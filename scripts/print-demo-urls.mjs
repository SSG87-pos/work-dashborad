import os from "node:os";

const port = process.argv[2] ?? "5173";
const interfaces = os.networkInterfaces();
const addresses = Object.values(interfaces)
  .flat()
  .filter((item) => item && item.family === "IPv4" && !item.internal)
  .map((item) => item.address)
  .filter(Boolean)
  .sort();

console.log(`Local:   http://127.0.0.1:${port}/`);

if (!addresses.length) {
  console.log("Network: no non-internal IPv4 address found");
  process.exit(0);
}

addresses.forEach((address) => {
  console.log(`Network: http://${address}:${port}/`);
});
