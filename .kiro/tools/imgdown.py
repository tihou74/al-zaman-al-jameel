#!/usr/bin/env python3
"""
imgdown — مُصغِّر PNG بـ Python الخالص (بلا Pillow، لأن PyPI محجوب هنا).

الغرض: علاج الصور التي يحجبها imgguard — يُنتج نسخة لا يتجاوز أي بُعد فيها
الحدّ (2000 بكسل افتراضياً) فتصبح قابلة للقراءة بأمان.

يستخدم متوسّط الصناديق (box average) لا أقرب جار، حتى يبقى النصّ
في لقطات الشاشة مقروءاً بعد التصغير.

الاستخدام:
  python3 imgdown.py <in.png> [out.png] [--max 2000]

يدعم: عمق 8 و16 بت، تدرّج رمادي/RGB/لوحة ألوان/مع قناة ألفا.
لا يدعم: PNG المتشابك (Adam7) وعمق أقل من 8 بت — يفشل برسالة واضحة
بدلاً من إنتاج صورة خاطئة بصمت.
"""

import os
import struct
import sys
import zlib

DEFAULT_MAX = 2000


# ---------------------------------------------------------------- فكّ PNG


def _read_chunks(data):
    pos = 8
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        typ = data[pos + 4:pos + 8]
        payload = data[pos + 8:pos + 8 + length]
        yield typ, payload
        pos += 8 + length + 4


def _unfilter(raw, width, height, bpp, stride):
    """يفكّ مرشّحات PNG الخمسة. يُرجع bytearray بطول height*stride."""
    out = bytearray(height * stride)
    pos = 0
    for y in range(height):
        ftype = raw[pos]
        pos += 1
        line = raw[pos:pos + stride]
        pos += stride
        cur = out
        base = y * stride
        prev = base - stride

        if ftype == 0:
            cur[base:base + stride] = line
        elif ftype == 1:  # Sub
            cur[base:base + bpp] = line[:bpp]
            for i in range(bpp, stride):
                cur[base + i] = (line[i] + cur[base + i - bpp]) & 0xFF
        elif ftype == 2:  # Up
            if y == 0:
                cur[base:base + stride] = line
            else:
                for i in range(stride):
                    cur[base + i] = (line[i] + cur[prev + i]) & 0xFF
        elif ftype == 3:  # Average
            for i in range(stride):
                a = cur[base + i - bpp] if i >= bpp else 0
                b = cur[prev + i] if y > 0 else 0
                cur[base + i] = (line[i] + ((a + b) >> 1)) & 0xFF
        elif ftype == 4:  # Paeth
            for i in range(stride):
                a = cur[base + i - bpp] if i >= bpp else 0
                b = cur[prev + i] if y > 0 else 0
                c = cur[prev + i - bpp] if (y > 0 and i >= bpp) else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                cur[base + i] = (line[i] + pr) & 0xFF
        else:
            raise ValueError(f"نوع مرشّح PNG غير معروف: {ftype} في السطر {y}")
    return out


def decode_png(path):
    """يُرجع (pixels: bytearray RGB/RGBA مسطّح, width, height, channels)."""
    with open(path, "rb") as f:
        data = f.read()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("ليس ملف PNG")

    idat = bytearray()
    palette = None
    trns = None
    w = h = depth = ctype = interlace = None

    for typ, payload in _read_chunks(data):
        if typ == b"IHDR":
            w, h, depth, ctype, _comp, _filt, interlace = struct.unpack(
                ">IIBBBBB", payload)
        elif typ == b"PLTE":
            palette = payload
        elif typ == b"tRNS":
            trns = payload
        elif typ == b"IDAT":
            idat += payload
        elif typ == b"IEND":
            break

    if interlace:
        raise ValueError("PNG متشابك (Adam7) غير مدعوم — أعد التوليد بلا تشابك")
    if depth < 8:
        raise ValueError(f"عمق {depth} بت غير مدعوم (المدعوم 8 و16)")

    channels_map = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
    if ctype not in channels_map:
        raise ValueError(f"نوع لون غير معروف: {ctype}")
    nch = channels_map[ctype]
    sample_bytes = depth // 8
    bpp = max(1, nch * sample_bytes)
    stride = w * bpp

    raw = zlib.decompress(bytes(idat))
    flat = _unfilter(raw, w, h, bpp, stride)

    # توحيد إلى 8 بت لكل عيّنة
    if sample_bytes == 2:
        flat = flat[0::2]  # نأخذ البايت الأعلى
        stride = w * nch

    # لوحة ألوان => RGB (أو RGBA إن وُجد tRNS)
    if ctype == 3:
        if palette is None:
            raise ValueError("PNG بلوحة ألوان بدون مقطع PLTE")
        has_alpha = trns is not None
        out_ch = 4 if has_alpha else 3
        conv = bytearray(w * h * out_ch)
        for i in range(w * h):
            idx = flat[i]
            conv[i * out_ch:i * out_ch + 3] = palette[idx * 3:idx * 3 + 3]
            if has_alpha:
                conv[i * out_ch + 3] = trns[idx] if idx < len(trns) else 255
        return conv, w, h, out_ch

    return flat, w, h, nch


# ---------------------------------------------------------------- التصغير


def box_downscale(pixels, w, h, nch, new_w, new_h):
    """متوسّط صناديق — يحفظ قابليّة قراءة النصّ، بخلاف أقرب جار."""
    out = bytearray(new_w * new_h * nch)
    # حدود الصناديق محسوبة مسبقاً لتقليل الحساب داخل الحلقة
    x_edges = [(x * w) // new_w for x in range(new_w + 1)]
    y_edges = [(y * h) // new_h for y in range(new_h + 1)]

    for oy in range(new_h):
        y0, y1 = y_edges[oy], max(y_edges[oy + 1], y_edges[oy] + 1)
        row_base = oy * new_w * nch
        for ox in range(new_w):
            x0, x1 = x_edges[ox], max(x_edges[ox + 1], x_edges[ox] + 1)
            count = (y1 - y0) * (x1 - x0)
            sums = [0] * nch
            for sy in range(y0, y1):
                line = sy * w * nch
                for sx in range(x0, x1):
                    p = line + sx * nch
                    for c in range(nch):
                        sums[c] += pixels[p + c]
            op = row_base + ox * nch
            for c in range(nch):
                out[op + c] = sums[c] // count
    return out


# ---------------------------------------------------------------- ترميز PNG


def encode_png(path, pixels, w, h, nch):
    ctype = {1: 0, 2: 4, 3: 2, 4: 6}[nch]
    stride = w * nch
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # مرشّح None
        raw += pixels[y * stride:(y + 1) * stride]

    def chunk(typ, payload):
        return (struct.pack(">I", len(payload)) + typ + payload
                + struct.pack(">I", zlib.crc32(typ + payload) & 0xFFFFFFFF))

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ctype, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(bytes(raw), 6)))
        f.write(chunk(b"IEND", b""))


# ---------------------------------------------------------------- الواجهة


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    limit = DEFAULT_MAX
    for i, a in enumerate(argv):
        if a == "--max" and i + 1 < len(argv):
            limit = int(argv[i + 1])
            args = [x for x in args if x != argv[i + 1]]

    if not args:
        print(__doc__)
        return 1

    src = args[0]
    if not os.path.isfile(src):
        print(f"غير موجود: {src}", file=sys.stderr)
        return 1

    pixels, w, h, nch = decode_png(src)
    longest = max(w, h)
    if longest <= limit:
        print(f"لا حاجة للتصغير: {w}x{h} ضمن حدّ {limit}")
        return 0

    scale = limit / longest
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    dst = args[1] if len(args) > 1 else (
        os.path.splitext(src)[0] + f".max{limit}.png")

    print(f"تصغير {w}x{h} => {new_w}x{new_h} (معامل {scale:.4f})")
    small = box_downscale(pixels, w, h, nch, new_w, new_h)
    encode_png(dst, small, new_w, new_h, nch)
    print(f"كُتبت: {dst}")
    print(f"الحجم: {os.path.getsize(dst):,} بايت")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
