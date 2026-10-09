/* ============================================================
   الزمن الجميل — منطق التأثيرات المتقدّمة
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ============================================================
     ١) مشعل الاستكشاف
     ============================================================ */
  function torch() {
    [].slice.call(document.querySelectorAll(".torch")).forEach(function (el) {
      var r = 0, target = 0, raf = null;

      function grow() {
        r += (target - r) * 0.16;
        el.style.setProperty("--tr", r.toFixed(1) + "px");
        el.style.setProperty("--halo", (r * 2.1).toFixed(1) + "px");
        if (Math.abs(target - r) > 0.6) {
          raf = requestAnimationFrame(grow);
        } else { raf = null; }
      }
      function kick() { if (!raf) raf = requestAnimationFrame(grow); }

      function move(x, y) {
        var b = el.getBoundingClientRect();
        el.style.setProperty("--tx", (((x - b.left) / b.width) * 100).toFixed(2) + "%");
        el.style.setProperty("--ty", (((y - b.top) / b.height) * 100).toFixed(2) + "%");
      }

      el.addEventListener("pointerenter", function (e) {
        el.classList.add("is-live");
        move(e.clientX, e.clientY);
        target = Math.min(el.clientWidth, el.clientHeight) * 0.42;
        kick();
      });
      el.addEventListener("pointermove", function (e) {
        move(e.clientX, e.clientY);
      });
      el.addEventListener("pointerleave", function () {
        el.classList.remove("is-live");
        target = 0;
        kick();
      });

      // على اللمس: المشعل يتبع الإصبع
      el.addEventListener("touchmove", function (e) {
        if (!e.touches.length) return;
        el.classList.add("is-live");
        move(e.touches[0].clientX, e.touches[0].clientY);
        target = Math.min(el.clientWidth, el.clientHeight) * 0.45;
        kick();
      }, { passive: true });
    });
  }

  /* ============================================================
     ٢) قبل / بعد
     ============================================================ */
  function beforeAfter() {
    [].slice.call(document.querySelectorAll(".ba")).forEach(function (el) {
      var bar = el.querySelector(".ba__bar");
      var dragging = false;

      function setFromX(clientX) {
        var b = el.getBoundingClientRect();
        var p = ((clientX - b.left) / b.width) * 100;
        p = Math.max(2, Math.min(98, p));
        el.style.setProperty("--split", p.toFixed(2) + "%");
      }

      function down(e) {
        dragging = true;
        el.setPointerCapture && e.pointerId != null &&
          el.setPointerCapture(e.pointerId);
        setFromX(e.clientX != null ? e.clientX : e.touches[0].clientX);
      }
      function move(e) {
        if (!dragging) return;
        setFromX(e.clientX != null ? e.clientX : e.touches[0].clientX);
      }
      function up() { dragging = false; }

      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      el.addEventListener("touchstart", down, { passive: true });
      el.addEventListener("touchmove", move, { passive: true });
      window.addEventListener("touchend", up);

      // الكيبورد
      if (bar) {
        bar.setAttribute("tabindex", "0");
        bar.setAttribute("role", "slider");
        bar.setAttribute("aria-label", "اسحب للمقارنة بين قبل وبعد");
        bar.addEventListener("keydown", function (e) {
          var cur = parseFloat(
            getComputedStyle(el).getPropertyValue("--split")) || 50;
          if (e.key === "ArrowLeft") { cur -= 4; }
          else if (e.key === "ArrowRight") { cur += 4; }
          else { return; }
          e.preventDefault();
          el.style.setProperty("--split",
            Math.max(2, Math.min(98, cur)).toFixed(2) + "%");
        });
      }
    });
  }

  /* ============================================================
     ٣) المشي داخل المطعم — لفّ أفقي مربوط بالتمرير
     ============================================================ */
  function walkThrough() {
    var wrap = document.querySelector(".walk");
    if (!wrap || reduced) return;
    var sticky = wrap.querySelector(".walk__sticky");
    var rail = wrap.querySelector(".walk__rail");
    var prog = wrap.querySelector(".walk__prog i");
    if (!rail || !sticky) return;

    var cards = [].slice.call(rail.querySelectorAll(".walk__card"));
    var raf = null;

    function run() {
      var b = wrap.getBoundingClientRect();
      var total = wrap.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -b.top / total)) : 0;

      /* الصفحة RTL: المحتوى الزائد يمتدّ إلى اليسار، فالكشف عنه
         يتطلّب تحريك الشريط إلى اليمين — أي قيمة موجبة.
         (كان سالباً فكان يُخفي المحتوى بدل أن يكشفه.) */
      var dist = Math.max(0, rail.scrollWidth - sticky.clientWidth);
      rail.style.transform = "translateX(" + (p * dist).toFixed(1) + "px)";

      if (prog) prog.style.width = (p * 100).toFixed(1) + "%";

      // إضاءة البطاقة الأقرب لمنتصف الشاشة
      var mid = window.innerWidth / 2, best = null, bestD = Infinity;
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect();
        var d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) { bestD = d; best = c; }
      });
      cards.forEach(function (c) { c.classList.toggle("is-focus", c === best); });

      raf = null;
    }

    function kick() { if (!raf) raf = requestAnimationFrame(run); }
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick, { passive: true });
    // بعد تحميل الصور تتغيّر الأبعاد، فنعيد الحساب
    window.addEventListener("load", kick);
    rail.querySelectorAll("img").forEach(function (im) {
      im.addEventListener("load", kick);
    });
    run();
  }

  /* ============================================================
     ٤) ميل ثلاثي الأبعاد
     ============================================================ */
  function tilt() {
    if (reduced || !fine) return;
    [].slice.call(document.querySelectorAll(".tilt")).forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var b = el.getBoundingClientRect();
        var dx = (e.clientX - (b.left + b.width / 2)) / (b.width / 2);
        var dy = (e.clientY - (b.top + b.height / 2)) / (b.height / 2);
        el.style.transform =
          "perspective(900px) rotateY(" + (dx * 7).toFixed(2) + "deg) rotateX(" +
          (-dy * 7).toFixed(2) + "deg) translateY(-5px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ============================================================
     ٥) كشف بقناع متحرّك
     ============================================================ */
  function wipes() {
    var els = [].slice.call(document.querySelectorAll("[data-wipe]"));
    if (!els.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("is-in"); });
      return;
    }
    var o = new IntersectionObserver(function (es, ob) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); ob.unobserve(en.target); }
      });
    }, { threshold: 0.25 });
    els.forEach(function (e) { o.observe(e); });
  }

  /* ============================================================
     ٦) عدّادات الأرقام (للاستخدام حين تُملأ الأرقام)
     ============================================================ */
  function counters() {
    var els = [].slice.call(document.querySelectorAll("[data-count]"));
    if (!els.length || !("IntersectionObserver" in window)) return;
    var AR = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    function fmt(n) {
      return String(Math.round(n)).replace(/\d/g, function (d) { return AR[+d]; })
        .replace(/\B(?=(\d{3})+(?!\d))/g, "");
    }
    var o = new IntersectionObserver(function (es, ob) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        ob.unobserve(en.target);
        var to = parseFloat(en.target.getAttribute("data-count"));
        var suffix = en.target.getAttribute("data-suffix") || "";
        if (isNaN(to)) return;
        var t0 = performance.now(), dur = 1400;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          en.target.textContent = fmt(to * e) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    els.forEach(function (e) { o.observe(e); });
  }

  /* ============================================================
     ٧) مؤشّر الجمرة مع أثر متلاشٍ
     ============================================================ */
  function emberCursor() {
    if (reduced || !fine) return;

    var dot = document.createElement("div");
    dot.className = "ember-cursor";
    document.body.appendChild(dot);

    var last = 0;
    window.addEventListener("mousemove", function (e) {
      dot.classList.add("is-on");
      dot.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";

      // أثر: جمرة صغيرة تتلاشى، بمعدّل محدود للأداء
      var now = performance.now();
      if (now - last < 55) return;
      last = now;

      var t = document.createElement("div");
      t.className = "ember-trail";
      t.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
      document.body.appendChild(t);

      var dx = (Math.random() - 0.5) * 26;
      t.animate(
        [
          { opacity: 0.65, transform: "translate(" + e.clientX + "px," + e.clientY + "px) scale(1)" },
          { opacity: 0, transform: "translate(" + (e.clientX + dx) + "px," + (e.clientY - 44) + "px) scale(.2)" }
        ],
        { duration: 820, easing: "cubic-bezier(.22,.61,.36,1)" }
      ).onfinish = function () { t.remove(); };
    }, { passive: true });

    window.addEventListener("mouseleave", function () {
      dot.classList.remove("is-on");
    });
  }

  /* ---------------------------------------------- التشغيل */
  function boot() {
    torch();
    beforeAfter();
    walkThrough();
    tilt();
    wipes();
    counters();
    emberCursor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();

/* ============================================================
   جدار الذكريات — عمق يتبع المؤشّر
   كل قطعة تتحرّك بمقدار data-depth فينشأ إحساس مجسّم حقيقي.
   ============================================================ */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

  var wall = document.getElementById("memwall");
  if (!wall) return;
  var items = [].slice.call(wall.querySelectorAll(".mem"));
  if (!items.length) return;

  var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

  function loop() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    items.forEach(function (el) {
      if (el.matches(":hover")) { el.style.removeProperty("--mx"); return; }
      var d = parseFloat(el.getAttribute("data-depth")) || 1;
      el.style.setProperty("--mx", (cx * d).toFixed(2) + "px");
      el.style.setProperty("--my", (cy * d).toFixed(2) + "px");
      el.style.transform =
        "translate(" + (cx * d).toFixed(2) + "px," + (cy * d).toFixed(2) +
        "px) rotate(var(--r,-3deg))";
    });
    if (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2) {
      raf = requestAnimationFrame(loop);
    } else { raf = null; }
  }

  wall.addEventListener("mousemove", function (e) {
    var b = wall.getBoundingClientRect();
    tx = ((e.clientX - (b.left + b.width / 2)) / b.width) * 26;
    ty = ((e.clientY - (b.top + b.height / 2)) / b.height) * 20;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  wall.addEventListener("mouseleave", function () {
    tx = 0; ty = 0;
    if (!raf) raf = requestAnimationFrame(loop);
  });
})();
