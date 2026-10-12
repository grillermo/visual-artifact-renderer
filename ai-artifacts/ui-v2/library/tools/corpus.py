#!/usr/bin/env python3
"""Corpus analysis for the library design pass. Read-only over the artifact store.

Usage: python3 -I corpus.py [store] > corpus.json
"""
import json, os, re, sys, collections, datetime

STORE = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.agents/skills/visual-artifact/artifacts")

rows = []
for project in sorted(os.listdir(STORE)):
    pdir = os.path.join(STORE, project)
    if not os.path.isdir(pdir):
        continue
    for slug in sorted(os.listdir(pdir)):
        adir = os.path.join(pdir, slug)
        f = os.path.join(adir, "artifact.json")
        if not os.path.isfile(f):
            continue
        try:
            spec = json.load(open(f))
        except Exception as e:
            rows.append({"project": project, "slug": slug, "error": str(e)})
            continue
        ann = os.path.join(adir, "annotations.json")
        comments = 0
        if os.path.isfile(ann):
            try:
                a = json.load(open(ann))
                items = a if isinstance(a, list) else a.get("annotations", a.get("comments", []))
                comments = len(items) if isinstance(items, list) else 0
            except Exception:
                pass
        text = json.dumps(spec)
        rows.append({
            "project": project,
            "slug": slug,
            "title": spec.get("title", ""),
            "description": spec.get("description", ""),
            "type": spec.get("artifactType"),
            "topics": spec.get("topics") or [],
            "mtime": datetime.datetime.fromtimestamp(os.path.getmtime(f)).isoformat(timespec="minutes"),
            "comments": comments,
            "nodes": len(spec.get("nodes", [])),
            "bytes": len(text),
            "githubRefs": sorted(set(re.findall(r"github\.com/([\w.-]+/[\w.-]+)", text)))[:5],
            "artifactLinks": len(re.findall(r"localhost:99\d\d/[\w-]+/[\w-]+", text)),
            "files": sorted(os.listdir(adir)),
        })

ok = [r for r in rows if "error" not in r]
by_project = collections.Counter(r["project"] for r in ok)
by_type = collections.Counter(r["type"] or "(none)" for r in ok)
topics = collections.Counter(t for r in ok for t in r["topics"])
months = collections.Counter(r["mtime"][:7] for r in ok)
days = collections.Counter(r["mtime"][:10] for r in ok)

# Series: slugs sharing a stem after stripping dates, versions, hashes, numeric suffixes.
def stem(slug):
    s = re.sub(r"-(v\d+|r\d+|round-\d+|\d{4}-\d{2}-\d{2}|\d{6,}|[0-9a-f]{7})$", "", slug)
    s = re.sub(r"-\d+$", "", s)
    return s
series = collections.defaultdict(list)
for r in ok:
    series[stem(r["slug"])].append(f'{r["project"]}/{r["slug"]}')
series = {k: v for k, v in series.items() if len(v) > 1}

titles = collections.defaultdict(list)
for r in ok:
    titles[r["title"].strip().lower()].append(f'{r["project"]}/{r["slug"]}')
dup_titles = {k: v for k, v in titles.items() if len(v) > 1}

out = {
    "store": STORE,
    "artifacts": len(ok),
    "errors": [r for r in rows if "error" in r],
    "projects": len(by_project),
    "byProject": by_project.most_common(),
    "byType": by_type.most_common(),
    "topicCount": len(topics),
    "topicsTop": topics.most_common(40),
    "topicsSingleton": sum(1 for c in topics.values() if c == 1),
    "byMonth": sorted(months.items()),
    "busiestDays": days.most_common(10),
    "withComments": sum(1 for r in ok if r["comments"]),
    "commentsTotal": sum(r["comments"] for r in ok),
    "withGithubRefs": sum(1 for r in ok if r["githubRefs"]),
    "withArtifactLinks": sum(1 for r in ok if r["artifactLinks"]),
    "noDescription": sum(1 for r in ok if not r["description"]),
    "noType": sum(1 for r in ok if not r["type"]),
    "noTopics": sum(1 for r in ok if not r["topics"]),
    "singletonProjects": sum(1 for c in by_project.values() if c == 1),
    "series": series,
    "duplicateTitles": dup_titles,
    "rows": ok,
}
json.dump(out, sys.stdout, indent=1)
