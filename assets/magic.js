/* ============================================================
   الزمن الجميل — منطق اللمسات الإبداعية
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     ١) مقدّمة شريط السينما — مرّة واحدة في الجلسة
     ============================================================ */
  function filmLeader() {
    if (reduced) return;
    try {
      if (sessionStorage.getItem("azj_leader") === "1") return;
    } catch (e) { /* التخزين محجوب — نكمل */ }

    var el = document.createElement("div");
    el.className = "leader";
    el.setAttribute("role", "presentation");
    el.innerHTML =
      '<div class="leader__dial">' +
        '<div class="leader__sweep"></div>' +
        '<span class="leader__num">٣</span>' +
        '<img class="leader__logo" src="assets/img/logo.png" alt="">' +
      "</div>" +
      '<div class="leader__scratch"></div>' +
      '<p class="leader__skip">اضغط للتخطّي</p>';
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";

    var num = el.querySelector(".leader__num");
    var logo = el.querySelector(".leader__logo");
    var seq = ["٣", "٢", "١"];
    var i = 0;
    var timers = [];

    function finish() {
      timers.forEach(clearTimeout);
      el.classList.add("is-gone");
      document.body.style.overflow = "";
      try { sessionStorage.setItem("azj_leader", "1"); } catch (e) {}
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        document.dispatchEvent(new CustomEvent("azj:leaderdone"));
      }, 1150);
    }

    function tick() {
      i += 1;
      if (i < seq.length) {
        num.textContent = seq[i];
        timers.push(setTimeout(tick, 620));
        return;
      }
      // انتهى العدّ: الشعار يُحمَّض كصورة قديمة
      num.style.display = "none";
      logo.classList.add("is-dev");
      timers.push(setTimeout(finish, 2000));
    }

    timers.push(setTimeout(tick, 620));
    el.addEventListener("click", finish);
    document.addEventListener("keydown", function once(ev) {
      if (ev.key === "Escape" || ev.key === "Enter" || ev.key === " ") {
        document.removeEventListener("keydown", once);
        finish();
      }
    });
  }

  /* ============================================================
     ٢) آلة الزمن — السنة ترجع للخلف، والسيبيا تزداد
     ============================================================ */
  function timeMachine() {
    if (reduced) return;

    var FROM = 2026, TO = 1965;
    var AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

    function toAr(n) {
      return String(n).split("").map(function (d) { return AR[+d] || d; }).join("");
    }

    var dial = document.createElement("div");
    dial.className = "timedial";
    dial.innerHTML =
      '<span class="timedial__ring"></span>' +
      "<span>" +
        '<span class="timedial__y" id="tdYear">' + toAr(FROM) + "</span>" +
        '<span class="timedial__l">آلة الزمن</span>' +
      "</span>";
    document.body.appendChild(dial);

    var patina = document.createElement("div");
    patina.className = "patina";
    document.body.appendChild(patina);

    var yearEl = dial.querySelector("#tdYear");
    var last = -1;

    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;

      var year = Math.round(FROM - (FROM - TO) * p);
      if (year !== last) {
        last = year;
        yearEl.textContent = toAr(year);
      }
      patina.style.opacity = (p * 0.5).toFixed(3);
      dial.classList.toggle("is-on", window.scrollY > 220);
    }

    var raf = null;
    window.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { update(); raf = null; });
    }, { passive: true });
    update();
  }

  /* ============================================================
     ٣) الفرن التفاعلي
     ============================================================ */
  function realOven() {
    var el = document.getElementById("ovenPhoto");
    if (!el) return;
    var hint = document.getElementById("ovenHint");
    var t = null;

    function flare() {
      el.classList.add("is-flare");
      if (hint) hint.textContent = "◦ تشتعل ◦";
      clearTimeout(t);
      t = setTimeout(function () {
        el.classList.remove("is-flare");
        if (hint) hint.textContent = "◦ اضغط لتشتعل أكثر ◦";
      }, 2600);
    }

    if (reduced) { if (hint) hint.textContent = "فرن الزمن الجميل"; return; }

    el.addEventListener("click", flare);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flare(); }
    });

    // توهّج ترحيبي عند الوصول
    if ("IntersectionObserver" in window) {
      var once = false;
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting && !once) { once = true; setTimeout(flare, 600); }
        });
      }, { threshold: 0.4 }).observe(el);
    }
  }

  /* ============================================================
     ٤) الفونوغراف — يتوقّف عند تمرير المؤشّر
     ============================================================ */
  function vinyl() {
    var v = document.getElementById("vinyl");
    if (!v) return;
    v.addEventListener("mouseenter", function () { v.classList.add("is-paused"); });
    v.addEventListener("mouseleave", function () { v.classList.remove("is-paused"); });
  }

  /* ============================================================
     ٥) وهج الفرن يتبع المؤشّر
     ============================================================ */
  function cursorGlow() {
    if (reduced) return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

    var g = document.createElement("div");
    g.className = "glow";
    document.body.appendChild(g);

    var tx = 0, ty = 0, cx = 0, cy = 0, on = false, raf = null;

    function loop() {
      cx += (tx - cx) * 0.11;
      cy += (ty - cy) * 0.11;
      g.style.transform = "translate(" + cx + "px," + cy + "px)";
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; g.classList.add("is-on"); }
      if (!raf) loop();
    }, { passive: true });

    window.addEventListener("mouseleave", function () {
      on = false; g.classList.remove("is-on");
    });
  }

  /* ============================================================
     ٦) أزرار مغناطيسيّة — تميل نحو المؤشّر
     ============================================================ */
  function magneticButtons() {
    if (reduced) return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

    [].slice.call(document.querySelectorAll(".btn")).forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform =
          "translate(" + (dx * 9).toFixed(2) + "px," + (dy * 7 - 3).toFixed(2) + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  /* ============================================================
     ٧) كشف العناوين كلمةً كلمة
     ============================================================ */
  function splitHeadings() {
    if (reduced) return;
    [].slice.call(document.querySelectorAll(".h2[data-split]")).forEach(function (h) {
      var words = h.textContent.trim().split(/\s+/);
      h.textContent = "";
      h.classList.add("h2--split");
      words.forEach(function (w, i) {
        var s = document.createElement("span");
        s.className = "w";
        s.textContent = w;
        s.style.transitionDelay = (i * 55) + "ms";
        h.appendChild(s);
        if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
      });

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es, o) {
          es.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add("is-in"); o.unobserve(en.target); }
          });
        }, { threshold: 0.3 }).observe(h);
      } else {
        h.classList.add("is-in");
      }
    });
  }

  /* ============================================================
     ٨) منظر متوازٍ خفيف للنقشات
     ============================================================ */
  function parallax() {
    if (reduced) return;
    var items = [].slice.call(document.querySelectorAll("[data-par]"));
    if (!items.length) return;
    var raf = null;

    function run() {
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var mid = r.top + r.height / 2 - window.innerHeight / 2;
        var k = parseFloat(el.getAttribute("data-par")) || 0.06;
        el.style.backgroundPosition = "center " + (-mid * k).toFixed(1) + "px";
      });
      raf = null;
    }
    window.addEventListener("scroll", function () {
      if (!raf) raf = requestAnimationFrame(run);
    }, { passive: true });
    run();
  }

  /* ---------------------------------------------- التشغيل */
  function boot() {
    timeMachine();
    realOven();
    vinyl();
    cursorGlow();
    magneticButtons();
    splitHeadings();
    parallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      filmLeader();
      boot();
    });
  } else {
    filmLeader();
    boot();
  }
})();
