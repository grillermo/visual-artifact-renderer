import json, glob, collections, os
os.chdir(os.path.expanduser("~/.agents/skills/visual-artifact/artifacts"))
types = collections.Counter(); per = []
for f in sorted(glob.glob("*/*/artifact.json")):
    try: d = json.load(open(f))
    except Exception: continue
    seen = collections.Counter()
    def walk(n):
        if not isinstance(n, dict): return
        if "type" in n: seen[n["type"]] += 1
        for c in (n.get("children") or n.get("props", {}).get("children") or []): walk(c)
        for v in n.get("props", {}).values():
            if isinstance(v, list):
                for c in v: walk(c)
    for n in d.get("nodes", []): walk(n)
    types.update(seen.keys())
    per.append((f.split("/artifact.json")[0], os.path.getmtime(f), seen))
print("artifacts:", len(per))
print("node types by number of artifacts using them:")
for t, c in types.most_common(): print("  %3d %s" % (c, t))
print("\nclaim-tree users:")
for p, m, s in sorted(per, key=lambda x: -x[1]):
    if "claim-tree" in s: print("  ", p)
print("\n12 newest artifacts and their types:")
for p, m, s in sorted(per, key=lambda x: -x[1])[:12]: print("  ", p, sorted(s))
