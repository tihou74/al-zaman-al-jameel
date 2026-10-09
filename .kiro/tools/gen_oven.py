#!/usr/bin/env python3
"""
gen_oven.py — يولّد SVG الفرن الحجري بطوب شعاعي محسوب هندسيّاً.

الطوب على قبّة حقيقيّة يتراصف في مداميك متحدّة المركز، والفواصل
بينها شعاعيّة ومتبادلة الإزاحة بين مدماك ومدماك — لا شبكة مستقيمة.
"""

import math

# ---- هندسة الفرن ----
CX, CY = 300.0, 462.0          # مركز القبّة (عند مستوى القاعدة)
RX, RY = 226.0, 356.0          # نصفا قطر القبّة
MRX, MRY = 112.0, 156.0        # نصفا قطر الفوهة
COURSES = [1.0, .885, .775, .668, .565, .466, .372, .282]


def pt(rx, ry, deg):
    a = math.radians(deg)
    return CX + rx * math.cos(a), CY - ry * math.sin(a)


def arc(rx, ry, a0=0.0, a1=180.0, step=3.0):
    """قوس نصف إهليلجي كمسار SVG."""
    pts = []
    n = int(abs(a1 - a0) / step)
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        x, y = pt(rx, ry, a)
        pts.append(f"{x:.1f} {y:.1f}")
    return "M" + " L".join(pts)


def build():
    out = []

    # ===== مداميك متحدّة المركز =====
    out.append('<g fill="none" stroke="#49281544" stroke-width="1.7">')
    for f in COURSES[1:]:
        out.append(f'  <path d="{arc(RX * f, RY * f)}"/>')
    out.append("</g>")

    # ===== فواصل شعاعيّة متبادلة الإزاحة =====
    out.append('<g stroke="#4928153a" stroke-width="1.5" stroke-linecap="round">')
    for ci in range(len(COURSES) - 1):
        r_out, r_in = COURSES[ci], COURSES[ci + 1]
        # عدد الطوبات يقلّ كلّما صعدنا
        n = max(5, int(17 - ci * 1.6))
        span = 180.0 / n
        offset = span / 2 if ci % 2 else 0.0
        for k in range(n + 1):
            a = offset + k * span
            if a <= 0.4 or a >= 179.6:
                continue
            x1, y1 = pt(RX * r_out, RY * r_out, a)
            x2, y2 = pt(RX * r_in, RY * r_in, a)
            out.append(f'  <path d="M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}"/>')
    out.append("</g>")

    # ===== إبراز حافّة كل طوبة بخطّ ضوء خفيف =====
    out.append('<g fill="none" stroke="#f0c49b22" stroke-width="1">')
    for f in COURSES[1:]:
        out.append(f'  <path d="{arc(RX * f - 1.6, RY * f - 1.6)}"/>')
    out.append("</g>")

    return "\n".join(out)


def voussoirs():
    """حجارة قوس الفوهة — أسافين شعاعيّة."""
    out = ['<g stroke="#2b1f14" stroke-width="2" stroke-opacity=".6" fill="none">']
    n = 11
    for k in range(1, n):
        a = 180.0 * k / n
        x1, y1 = pt(MRX + 6, MRY + 6, a)
        x2, y2 = pt(MRX + 36, MRY + 42, a)
        out.append(f'  <path d="M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}"/>')
    out.append("</g>")
    return "\n".join(out)


if __name__ == "__main__":
    print("<!-- طوب القبّة -->")
    print(build())
    print("<!-- حجارة القوس -->")
    print(voussoirs())
    print()
    print("<!-- مسارات للأقنعة -->")
    print(f'dome:  {arc(RX, RY)} L{CX - RX:.1f} {CY:.1f} Z')
    print(f'mouth: {arc(MRX, MRY)} L{CX - MRX:.1f} {CY:.1f} Z')
