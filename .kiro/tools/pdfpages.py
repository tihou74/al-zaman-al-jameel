#!/usr/bin/env python3
"""pdfpages — يربط كل صفحة PDF بالصور المضمّنة فيها (عبر /XObject)."""
import re
import sys

sys.path.insert(0, "/projects/sandbox/.kiro/tools")
from pdftext import (load_objects, dict_after_key, page_tree,  # noqa: E402
                     page_content)


def main(path, only=None):
    data = open(path, "rb").read()
    objs = load_objects(data)
    order = page_tree(objs)

    # أبعاد كل كائن صورة
    dims = {}
    for n, b in objs.items():
        if re.search(rb"/Subtype\s*/Image\b", b):
            w = re.search(rb"/Width\s+(\d+)", b)
            h = re.search(rb"/Height\s+(\d+)", b)
            f = re.search(rb"/Filter\s*(\[[^\]]*\]|/\w+)", b)
            dims[n] = (int(w.group(1)) if w else 0,
                       int(h.group(1)) if h else 0,
                       (f.group(1).decode("latin1") if f else "?"))

    for idx, pnum in enumerate(order, 1):
        if only and idx != only:
            continue
        body = objs.get(pnum, b"")
        res = dict_after_key(body, b"Resources")
        if res is None:
            m = re.search(rb"/Resources\s+(\d+)\s+\d+\s+R", body)
            res = objs.get(int(m.group(1)), b"") if m else b""

        refs, seen = [], set()

        def collect(dic, depth=0):
            """يجمع مراجع XObject، ويغوص في XObjects من نوع Form."""
            if depth > 4 or not dic:
                return
            xo = dict_after_key(dic, b"XObject")
            if xo is None:
                m2 = re.search(rb"/XObject\s+(\d+)\s+\d+\s+R", dic)
                xo = objs.get(int(m2.group(1)), b"") if m2 else None
            if not xo:
                return
            for m3 in re.finditer(rb"/([A-Za-z0-9_.\-]+)\s+(\d+)\s+\d+\s+R", xo):
                ref = int(m3.group(2))
                if ref in seen:
                    continue
                seen.add(ref)
                if ref in dims:
                    refs.append(ref)
                else:
                    sub = objs.get(ref, b"")
                    if re.search(rb"/Subtype\s*/Form\b", sub):
                        r2 = dict_after_key(sub, b"Resources")
                        collect(r2, depth + 1)

        collect(res)
        content = page_content(objs, pnum)
        print(f"--- صفحة {idx} (كائن {pnum}) — صور: {len(refs)} "
              f"| حجم المحتوى: {len(content):,}")
        for r in sorted(refs, key=lambda x: -(dims[x][0] * dims[x][1])):
            w, h, f = dims[r]
            print(f"      obj{r:<5} {w}x{h:<6} {f}")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else None)
