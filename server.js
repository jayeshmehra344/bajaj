const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const MY_ID = "jayeshmehra_03042005";
const MY_EMAIL = "jm9927@srmist.edu.in";
const MY_ROLL = "RA2311003011102";



const edgePattern = /^[A-Z]->[A-Z]$/;

app.post("/bfhl", (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "data should be an array" });
  }

  const good = [];
  const invalid = [];
  const dupes = [];
  const seen = new Set();

  for (let raw of data) {
    const s = typeof raw === "string" ? raw.trim() : String(raw).trim();

    if (!edgePattern.test(s)) {
      invalid.push(s);
      continue;
    }

    const [p, c] = s.split("->");

    if (p === c) {
      invalid.push(s);
      continue;
    }

    if (seen.has(s)) {
      if (!dupes.includes(s)) dupes.push(s);
    } else {
      seen.add(s);
      good.push([p, c]);
    }
  }

  const kids = {};
  const par = {};
  const nodes = new Set();

  for (const [p, c] of good) {
    nodes.add(p);
    nodes.add(c);
    if (!kids[p]) kids[p] = [];
    if (par[c] !== undefined) continue; 
    par[c] = p;
    kids[p].push(c);
  }

  const visited = new Set();
  const groups = [];

  for (const n of nodes) {
    if (visited.has(n)) continue;
    const group = [];
    const q = [n];
    while (q.length) {
      const cur = q.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      group.push(cur);
      for (const nb of getNeighbours(cur)) {
        if (!visited.has(nb)) q.push(nb);
      }
    }
    groups.push(group);
  }

  function getNeighbours(n) {
    const nb = new Set();
    if (kids[n]) kids[n].forEach(c => nb.add(c));
    if (par[n] !== undefined) nb.add(par[n]);
    return nb;
  }

  const hierarchies = [];

  for (const group of groups) {
    const gset = new Set(group);

    const roots = group.filter(n => par[n] === undefined);
    const root = roots.length > 0 ? roots.sort()[0] : [...group].sort()[0];

    const color = {};
    let cyclic = false;

    function dfs(n) {
      color[n] = 1;
      for (const child of (kids[n] || [])) {
        if (!gset.has(child)) continue;
        if (color[child] === 1) { cyclic = true; return; }
        if (!color[child]) dfs(child);
      }
      color[n] = 2;
    }

    for (const n of group) {
      if (!color[n]) dfs(n);
      if (cyclic) break;
    }

    if (cyclic) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
      continue;
    }

    function makeTree(n) {
      const obj = {};
      for (const child of (kids[n] || [])) {
        obj[child] = makeTree(child);
      }
      return obj;
    }

    function depth(n) {
      const children = kids[n] || [];
      if (children.length === 0) return 1;
      return 1 + Math.max(...children.map(depth));
    }

    hierarchies.push({
      root,
      tree: { [root]: makeTree(root) },
      depth: depth(root)
    });
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));


  const trees = hierarchies.filter(h => !h.has_cycle);
  const cycles = hierarchies.filter(h => h.has_cycle);

  let bigRoot = "";
  let maxD = -1;
  for (const h of trees) {
    if (h.depth > maxD || (h.depth === maxD && h.root < bigRoot)) {
      maxD = h.depth;
      bigRoot = h.root;
    }
  }

  res.json({
    user_id: MY_ID,
    email_id: MY_EMAIL,
    college_roll_number: MY_ROLL,
    hierarchies,
    invalid_entries: invalid,
    duplicate_edges: dupes,
    summary: {
      total_trees: trees.length,
      total_cycles: cycles.length,
      largest_tree_root: bigRoot
    }
  });
});

app.get("/", (req, res) => res.send("running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`port ${PORT}`));