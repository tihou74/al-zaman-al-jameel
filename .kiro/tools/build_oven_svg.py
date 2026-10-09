#!/usr/bin/env python3
"""
build_oven_svg.py — يجمّع SVG الفرن الحجري كاملاً ويزرعه في index.html.

يعتمد على gen_oven.py لحساب الطوب الشعاعي، ويضيف طبقات الإضاءة
والتفاصيل بترتيب عمق صحيح.
"""

import math
import re
import sys

sys.path.insert(0, "/projects/sandbox/.kiro/tools")
import gen_oven as G  # noqa: E402

CX, CY, RX, RY = G.CX, G.CY, G.RX, G.RY
MRX, MRY = G.MRX, G.MRY

DOME = f"{G.arc(RX, RY)} L{CX - RX:.1f} {CY:.1f} Z"
MOUTH = f"{G.arc(MRX, MRY)} L{CX - MRX:.1f} {CY:.1f} Z"
ARCH_OUT = f"{G.arc(MRX + 34, MRY + 40)} L{CX - MRX - 34:.1f} {CY:.1f} Z"

BRICKS = G.build()
VOUSS = G.voussoirs()


def firewood(x, y, n=3):
    """كومة حطب مرصوص."""
    out = []
    for i in range(n):
        w = 86 - i * 10
        yy = y - i * 13
        xx = x + i * 6
        out.append(
            f'<rect x="{xx}" y="{yy}" width="{w}" height="12.5" rx="6" '
            f'fill="#6E4A2A" stroke="#40260F" stroke-width="1.5"/>'
            f'<circle cx="{xx}" cy="{yy + 6.2:.1f}" r="6.2" fill="#8E6F49" '
            f'stroke="#40260F" stroke-width="1.3"/>'
            f'<circle cx="{xx}" cy="{yy + 6.2:.1f}" r="2.4" fill="#5A3D22"/>'
        )
    return "".join(out)


SVG = f'''<svg viewBox="0 0 600 580" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="clay" cx="38%" cy="16%" r="92%">
      <stop offset="0"   stop-color="#D59A68"/>
      <stop offset=".34" stop-color="#B06F42"/>
      <stop offset=".72" stop-color="#8A5330"/>
      <stop offset="1"   stop-color="#4E2C19"/>
    </radialGradient>
    <linearGradient id="domeShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#000" stop-opacity="0"/>
      <stop offset=".62" stop-color="#000" stop-opacity=".08"/>
      <stop offset="1"   stop-color="#000" stop-opacity=".42"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#CBAE85"/>
      <stop offset=".5"  stop-color="#9E7F5A"/>
      <stop offset="1"   stop-color="#63482F"/>
    </linearGradient>
    <linearGradient id="sill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9A8062"/>
      <stop offset="1" stop-color="#4A3B2C"/>
    </linearGradient>
    <radialGradient id="archLit" cx="50%" cy="100%" r="70%">
      <stop offset="0"   stop-color="#FF9A33" stop-opacity=".5"/>
      <stop offset="1"   stop-color="#FF8A2B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cave" cx="50%" cy="98%" r="96%">
      <stop offset="0"   stop-color="#C85A1C"/>
      <stop offset=".26" stop-color="#6A2708"/>
      <stop offset=".58" stop-color="#200C03"/>
      <stop offset="1"   stop-color="#060200"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="100%" r="80%">
      <stop offset="0"   stop-color="#FFB45A" stop-opacity=".9"/>
      <stop offset=".5"  stop-color="#FF7E22" stop-opacity=".4"/>
      <stop offset="1"   stop-color="#FF6A14" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="spillg" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FFA23C" stop-opacity=".9"/>
      <stop offset="1" stop-color="#FF8A2B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flameG" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0"   stop-color="#FF3F08"/>
      <stop offset=".38" stop-color="#FF8A1C"/>
      <stop offset=".74" stop-color="#FFC247"/>
      <stop offset="1"   stop-color="#FFEFBE"/>
    </linearGradient>
    <linearGradient id="coreG" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFD15C"/>
      <stop offset="1" stop-color="#FFFBEA"/>
    </linearGradient>
    <linearGradient id="potG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#E09C5E"/>
      <stop offset=".55" stop-color="#B06C36"/>
      <stop offset="1"   stop-color="#6E3C1C"/>
    </linearGradient>
    <linearGradient id="woodG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8E6A3E"/>
      <stop offset=".5" stop-color="#C9A063"/>
      <stop offset="1" stop-color="#7E5C34"/>
    </linearGradient>
    <radialGradient id="soot" cx="50%" cy="100%" r="60%">
      <stop offset="0" stop-color="#1A0E06" stop-opacity=".55"/>
      <stop offset="1" stop-color="#1A0E06" stop-opacity="0"/>
    </radialGradient>


    <!-- اهتزاز الحرارة: feTurbulence يولّد ضجيجاً، وfeDisplacementMap
         يُزيح البكسلات به — فيرتجف الهواء كما فوق نار حقيقيّة. -->
    <filter id="heat" x="-25%" y="-25%" width="150%" height="150%"
            color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.022"
                    numOctaves="2" seed="7" result="noise">
        <animate attributeName="baseFrequency"
                 dur="9s" repeatCount="indefinite"
                 values="0.008 0.022;0.013 0.034;0.010 0.027;0.008 0.022"/>
        <animate attributeName="seed" dur="4s" repeatCount="indefinite"
                 values="7;19;31;7"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5"
                         xChannelSelector="R" yChannelSelector="G" result="disp"/>
      <!-- تمويه يُذيب حواف التمزّق فيبقى اللهب لهباً -->
      <feGaussianBlur in="disp" stdDeviation="1.9"/>
    </filter>

    <filter id="heatStrong" x="-35%" y="-35%" width="170%" height="170%"
            color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06"
                    numOctaves="3" seed="2" result="n">
        <animate attributeName="baseFrequency" dur="5.5s" repeatCount="indefinite"
                 values="0.02 0.06;0.034 0.09;0.02 0.06"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="16"
                         xChannelSelector="R" yChannelSelector="B"/>
      <feGaussianBlur stdDeviation="1.1"/>
    </filter>

    <linearGradient id="hazeG" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0"   stop-color="#FFB45A" stop-opacity=".3"/>
      <stop offset=".55" stop-color="#FF9A33" stop-opacity=".12"/>
      <stop offset="1"   stop-color="#FF8A2B" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="domeClip"><path d="{DOME}"/></clipPath>
    <clipPath id="mouthClip"><path d="{MOUTH}"/></clipPath>

    <filter id="soft"   x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="softer" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="20"/></filter>
    <filter id="flameBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
  </defs>

  <!-- ===== ضوء منسكب على الأرض ===== -->
  <ellipse class="spill" cx="300" cy="528" rx="226" ry="40" fill="url(#spillg)" filter="url(#soft)"/>

  <!-- ===== دخان المدخنة ===== -->
  <g class="smoke" fill="#CEC2B2" filter="url(#soft)">
    <circle cx="330" cy="78" r="15"/><circle cx="340" cy="78" r="11"/>
    <circle cx="322" cy="78" r="12"/><circle cx="334" cy="78" r="9"/>
  </g>

  <!-- ===== المدخنة ===== -->
  <path d="M306 128 L306 58 Q306 46 318 46 L344 46 Q356 46 356 58 L356 130 Z"
        fill="url(#clay)" stroke="#4A2C19" stroke-width="2.4"/>
  <rect x="299" y="39" width="64" height="14" rx="5" fill="#8A5433" stroke="#4A2C19" stroke-width="2.2"/>
  <path d="M306 58 L306 128" stroke="#F0C49B" stroke-opacity=".2" stroke-width="3"/>

  <!-- ===== القبّة ===== -->
  <path d="{DOME}" fill="url(#clay)"/>
  <g clip-path="url(#domeClip)">
{BRICKS}
    <!-- تظليل الحجم -->
    <path d="{DOME}" fill="url(#domeShade)"/>
    <!-- عتمة عند القاعدة -->
    <ellipse cx="300" cy="470" rx="240" ry="54" fill="#1A0E06" opacity=".3" filter="url(#soft)"/>
    <!-- ضوء النار يرتدّ على القبّة حول الفوهة -->
    <ellipse cx="300" cy="455" rx="186" ry="150" fill="url(#archLit)" filter="url(#soft)"/>
    <!-- تنوّع لوني في الطين -->
    <ellipse cx="190" cy="300" rx="130" ry="170" fill="#D59A68" opacity=".14" filter="url(#softer)"/>
    <ellipse cx="420" cy="360" rx="110" ry="150" fill="#5E3520" opacity=".2" filter="url(#softer)"/>
    <!-- سواد الدخان أعلى الفوهة -->
    <ellipse cx="300" cy="300" rx="104" ry="86" fill="url(#soot)" filter="url(#soft)"/>
  </g>
  <!-- حافّة ضوء على القبّة -->
  <path d="{G.arc(RX, RY)}" fill="none" stroke="#EFC498" stroke-opacity=".42" stroke-width="3.4"/>

  <!-- ===== قوس الفوهة الحجري ===== -->
  <path d="{ARCH_OUT}" fill="url(#sill)"/>
  <path d="{ARCH_OUT}" fill="none" stroke="#2A1E14" stroke-width="3"/>
{VOUSS}
  <!-- ضوء النار على حجارة القوس -->
  <path d="{ARCH_OUT}" fill="url(#archLit)" opacity=".75"/>

  <!-- ===== داخل الفرن ===== -->
  <path d="{MOUTH}" fill="url(#cave)"/>
  <g clip-path="url(#mouthClip)">
    <!-- أرضيّة حجريّة -->
    <path d="M180 462 L180 430 L420 430 L420 462 Z" fill="#3E2716"/>
    <ellipse cx="300" cy="432" rx="118" ry="14" fill="#5C3A22"/>
    <g stroke="#2A1810" stroke-opacity=".55" stroke-width="1.6">
      <path d="M232 426 L227 462"/><path d="M300 426 L300 462"/><path d="M368 426 L373 462"/>
    </g>

    <!-- وهج داخلي -->
    <ellipse class="mouthglow" cx="300" cy="438" rx="132" ry="104" fill="url(#glow)" filter="url(#soft)"/>

    <!-- جمر -->
    <g class="embers">
      <ellipse cx="300" cy="434" rx="100" ry="13" fill="#FF6A14" opacity=".82" filter="url(#soft)"/>
      <circle cx="240" cy="432" r="4.6" fill="#FFB84A"/><circle cx="266" cy="436" r="3.4" fill="#FF8A2B"/>
      <circle cx="334" cy="434" r="4.2" fill="#FFC247"/><circle cx="360" cy="436" r="3"   fill="#FF7A1F"/>
      <circle cx="300" cy="438" r="3.6" fill="#FFD36B"/>
    </g>

    <!-- اللهب خلف الطاجن — باهتزاز الحرارة -->
    <g filter="url(#heat)">
      <path class="fl fl--c" fill="url(#flameG)" opacity=".8"
            d="M240 434 C214 394 230 358 248 328 C258 362 276 398 256 434 Z"/>
      <path class="fl fl--b" fill="url(#flameG)" opacity=".92"
            d="M350 434 C328 396 344 358 364 326 C374 362 392 400 370 434 Z"/>
      <path class="fl fl--a" fill="url(#flameG)"
            d="M300 436 C262 390 280 336 300 294 C320 336 338 390 300 436 Z"/>
      <path class="fl fl--core" fill="url(#coreG)"
            d="M300 434 C288 410 294 382 300 358 C306 382 314 410 300 434 Z"/>
    </g>

    <!-- الطاجن أمام اللهب ليبقى واضحاً -->
    <g class="tagine">
      <ellipse cx="300" cy="434" rx="56" ry="12" fill="#1A0E06" opacity=".55"/>
      <!-- وهج حول الطاجن ليبرز عن اللهب -->
      <ellipse cx="300" cy="412" rx="66" ry="40" fill="#1A0E06" opacity=".3" filter="url(#soft)"/>
      <!-- قِدر الطاجن -->
      <path d="M252 433 C252 416 348 416 348 433 Z" fill="#8A4E26"/>
      <ellipse cx="300" cy="418" rx="48" ry="9" fill="#A6632F"/>
      <!-- غطاء مخروطي عالٍ -->
      <path d="M256 418 C262 366 338 366 344 418 Z" fill="url(#potG)"/>
      <path d="M264 414 C270 374 330 374 336 414" fill="none"
            stroke="#F2C491" stroke-opacity=".55" stroke-width="2.4"/>
      <path d="M276 408 C280 384 320 384 324 408" fill="none"
            stroke="#7A4421" stroke-opacity=".45" stroke-width="1.8"/>
      <ellipse cx="300" cy="418" rx="44" ry="7" fill="#B06C36"/>
      <!-- مقبض -->
      <path d="M300 372 L300 362" stroke="#7A4120" stroke-width="4" stroke-linecap="round"/>
      <circle cx="300" cy="358" r="7.5" fill="#E0A86E" stroke="#7A4120" stroke-width="2"/>
      <g class="steamp" stroke="#FFE6C2" stroke-width="2.8" fill="none" stroke-linecap="round">
        <path d="M280 350 C273 334 287 325 280 309"/>
        <path d="M300 344 C293 326 307 317 300 301"/>
        <path d="M320 350 C313 334 327 325 320 309"/>
      </g>
    </g>

    <!-- المجرفة الخشبيّة -->
    <g class="peel">
      <rect x="298" y="416" width="268" height="10" rx="5" fill="url(#woodG)"/>
      <path d="M222 404 L304 404 L304 430 L222 430 Q210 417 222 404 Z" fill="url(#woodG)"/>
      <ellipse cx="258" cy="401" rx="33" ry="11" fill="#DFAE70"/>
      <ellipse cx="258" cy="399" rx="26" ry="7" fill="#F2CB91" opacity=".85"/>
      <path d="M240 398 L276 398" stroke="#B4874E" stroke-width="2" stroke-linecap="round"/>
    </g>
  </g>

  <!-- ===== موجة حرارة تخرج من الفوهة وترتجف ===== -->
  <g class="haze" filter="url(#heatStrong)">
    <path d="M196 458 C196 392 404 392 404 458 Z" fill="url(#hazeG)"/>
    <path d="M226 440 C226 356 374 356 374 440 Z" fill="url(#hazeG)" opacity=".7"/>
  </g>

  <!-- ===== عتبة الفوهة ===== -->
  <rect x="176" y="455" width="248" height="17" rx="5" fill="url(#sill)" stroke="#2A1E14" stroke-width="2.2"/>
  <rect x="176" y="455" width="248" height="5" rx="2.5" fill="#FFA23C" opacity=".35"/>

  <!-- ===== قاعدة الفرن ===== -->
  <path d="M52 462 L548 462 L566 524 L34 524 Z" fill="url(#stone)" stroke="#43361F" stroke-width="2.6"/>
  <g stroke="#43361F" stroke-opacity=".45" stroke-width="2" fill="none">
    <path d="M146 462 L136 524"/><path d="M240 462 L236 524"/>
    <path d="M360 462 L364 524"/><path d="M454 462 L464 524"/>
    <path d="M44 492 L556 492"/>
  </g>
  <!-- ضوء النار على سطح القاعدة -->
  <path d="M52 462 L548 462 L552 476 L48 476 Z" fill="#FFA23C" opacity=".2"/>

  <!-- ===== حطب ===== -->
  {firewood(72, 500)}
  {firewood(442, 500)}
</svg>'''


def main():
    # تنظيف أي حرف تسلّل
    svg = re.sub(r'stop-color="#[^"]*košik"[^/]*/>', "", SVG)
    svg = re.sub(r'#D59A६8', '#D59A68', svg)

    path = "/projects/sandbox/al-zaman-al-jameel/index.html"
    html = open(path, encoding="utf-8").read()
    new, n = re.subn(r"<svg\b.*?</svg>", lambda m: svg, html, count=1, flags=re.S)
    if n != 1:
        print("❌ لم يُستبدل SVG", file=sys.stderr)
        return 1
    open(path, "w", encoding="utf-8").write(new)
    print(f"✅ زُرع SVG جديد ({len(svg):,} حرف)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
