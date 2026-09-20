const res = await fetch("https://prestocks.com/api/metrics", {
  headers: { accept: "application/json" },
});
const text = await res.text();
console.log("status", res.status, "bytes", text.length);
let j;
try {
  j = JSON.parse(text);
} catch (e) {
  console.log("not json", text.slice(0, 200));
  process.exit(1);
}
console.log("rootType", Array.isArray(j) ? "array" : typeof j);
if (Array.isArray(j)) {
  console.log("len", j.length);
  if (j[0] && typeof j[0] === "object") console.log("item0keys", Object.keys(j[0]));
} else if (j && typeof j === "object") {
  console.log("topKeys", Object.keys(j).slice(0, 60));
}
const s = JSON.stringify(j);
for (const k of [
  "deadline",
  "conversion",
  "lockup",
  "expir",
  "event",
  "SPACEX",
  "spacex",
  "PreAN",
  "March",
  "2027",
  "maturity",
]) {
  console.log("contains", k, s.includes(k) || s.toLowerCase().includes(k.toLowerCase()));
}
function findSpacex(node, path = "") {
  if (!node || typeof node !== "object") return;
  const blob = JSON.stringify(node);
  if (blob.includes("PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh") || /spacex/i.test(blob)) {
    if (!Array.isArray(node)) {
      console.log("objectAt", path, Object.keys(node));
    }
  }
  if (Array.isArray(node)) {
    node.slice(0, 200).forEach((x, i) => findSpacex(x, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (v && typeof v === "object") findSpacex(v, path ? `${path}.${k}` : k);
  }
}
findSpacex(j);
const idx = s.indexOf("PreAN");
console.log("preanIdx", idx, idx >= 0 ? s.slice(Math.max(0, idx - 80), idx + 200) : "");
