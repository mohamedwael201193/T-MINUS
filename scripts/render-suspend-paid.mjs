import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let fileKey = "";
for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  if (line.startsWith("RENDER_API_KEY=")) {
    fileKey = line.slice("RENDER_API_KEY=".length).trim();
    break;
  }
}
if (!fileKey) {
  console.error("no key in .env");
  process.exit(1);
}

const ids = ["srv-dao6qhp42hec738m40eg", "srv-dao6pop42hec738m1fkg"];
for (const id of ids) {
  const res = await fetch(`https://api.render.com/v1/services/${id}/suspend`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${fileKey}`,
    },
  });
  const text = await res.text();
  let extra = text.slice(0, 160);
  try {
    const j = JSON.parse(text);
    extra = j.message || j.suspended || (j.service && j.service.suspended) || JSON.stringify(j).slice(0, 160);
  } catch {
    /* keep */
  }
  console.log("suspend", id, res.status, extra);
}
