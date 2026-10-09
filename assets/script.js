/* ============================================================
   الزمن الجميل — تفاعلات الموقع
   بلا أي اعتماديّات خارجية.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------- الترويسة */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");
  var progress = document.getElementById("progress");

  function onScroll() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 40);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------------------------------------- تمييز القسم الحالي */
  var links = [].slice.call(document.querySelectorAll('.nav__menu a[href^="#"]'));
  var targets = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && targets.length) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle(
            "is-active",
            a.getAttribute("href") === "#" + en.target.id
          );
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    targets.forEach(function (t) { secObs.observe(t); });
  }

  /* ---------------------------------------------- ظهور تدريجي */
  var reveals = [].slice.call(document.querySelectorAll("[data-reveal]"));
  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { revObs.observe(el); });
  }

  /* ---------------------------------------------- صندوق التكبير */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbCap = document.getElementById("lbCap");
  var lbClose = document.getElementById("lbClose");

  function openLb(src, alt, cap) {
    if (!lb) return;
    lbImg.src = src;
    lbImg.alt = alt || "";
    lbCap.textContent = cap || "";
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (lbClose) lbClose.focus();
  }
  function closeLb() {
    if (!lb) return;
    lb.classList.remove("is-open");
    lbImg.src = "";
    document.body.style.overflow = "";
  }

  document.addEventListener("click", function (e) {
    var fig = e.target.closest && e.target.closest(".gallery__item, .pattern");
    if (fig) {
      var img = fig.querySelector("img");
      var cap = fig.querySelector("figcaption, span");
      if (img) openLb(img.src, img.alt, cap ? cap.textContent : "");
      return;
    }
    if (e.target === lb || e.target === lbClose) closeLb();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLb();
  });

  /* ============================================================
     المشغّل التشويقي
     يعمل بالصور والحركة الآن، ويستبدل نفسه تلقائياً
     بملفّ فيديو حقيقي إن وُجد في assets/video/.
     ============================================================ */

  var EPISODES = [
    {
      video: "assets/video/teaser-01-place.mp4",
      shots: [
        { img: "assets/img/interior-01.jpg",
          line: "تذكر هذا المكان؟",
          sub: "صالون عربي، عود على الحائط، وضوء دافئ" },
        { img: "assets/img/interior-02.jpg",
          line: "حيث كانت الصور تُعلَّق لا تُحفظ",
          sub: "حائط الذكريات" },
        { img: "assets/img/interior-05.jpg",
          line: "والبلاط يحكي قبل أن تجلس",
          sub: "تفاصيل من الزمن الجميل" },
        { img: "assets/img/brand-placemat.jpg",
          line: "الزمن الجميل",
          sub: "قريباً" }
      ]
    },
    {
      video: "assets/video/teaser-02-oven.mp4",
      shots: [
        { img: "assets/img/interior-06.jpg",
          line: "كل شيء يبدأ من الفرن",
          sub: "طواجن، صواني، وفطائر" },
        { img: "assets/img/dish-pasta.jpg",
          line: "يدخل نيئاً…",
          sub: "ويخرج بالبخار والرائحة" },
        { img: "assets/img/pattern-red.jpg",
          line: "طريقة طهي واحدة",
          sub: "تجمع المنيو كله" },
        { img: "assets/img/dish-cheesecake.jpg",
          line: "وحتى الحلو… من الفرن",
          sub: "الزمن الجميل" }
      ]
    },
    {
      video: "assets/video/teaser-03-opening.mp4",
      shots: [
        { img: "assets/img/interior-04.jpg",
          line: "الطاولات جاهزة",
          sub: "والفرن أُشعل" },
        { img: "assets/img/interior-03.jpg",
          line: "ما بقي إلا أنت",
          sub: "" },
        { img: "assets/img/brand-placemat.jpg",
          line: "الزمن الجميل",
          sub: "افتتاح قريب" }
      ]
    }
  ];

  var SHOT_MS = 7500;

  var stage = document.getElementById("stage");
  var bar = document.getElementById("tBar");
  var lineEl = document.getElementById("tLine");
  var subEl = document.getElementById("tSub");
  var playBtn = document.getElementById("tPlay");
  var nextBtn = document.getElementById("tNext");
  var epBtns = [].slice.call(document.querySelectorAll(".episode"));

  if (stage && bar && lineEl && subEl) {
    var ep = 0;
    var shot = 0;
    var timer = null;
    var playing = !reduced;

    function buildEpisode(index) {
      ep = index;
      shot = 0;
      stage.innerHTML = "";
      bar.innerHTML = "";

      var data = EPISODES[index];

      data.shots.forEach(function (s, i) {
        var d = document.createElement("div");
        d.className = "teaser__shot";
        var im = document.createElement("img");
        im.src = s.img;
        im.alt = s.sub || s.line || "";
        im.loading = i === 0 ? "eager" : "lazy";
        d.appendChild(im);
        stage.appendChild(d);

        var seg = document.createElement("div");
        seg.className = "teaser__seg";
        seg.appendChild(document.createElement("i"));
        bar.appendChild(seg);
      });

      epBtns.forEach(function (b, i) {
        b.classList.toggle("is-active", i === index);
      });

      // استبدال تلقائي بالفيديو الحقيقي إن توفّر
      tryVideo(data.video);

      render();
      if (playing) schedule();
    }

    function tryVideo(src) {
      if (!src) return;
      fetch(src, { method: "HEAD" })
        .then(function (r) {
          if (!r.ok) return;
          stop();
          stage.innerHTML = "";
          var v = document.createElement("video");
          v.src = src;
          v.autoplay = true;
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.setAttribute("style",
            "width:100%;height:100%;object-fit:cover;position:absolute;inset:0");
          stage.appendChild(v);
          bar.innerHTML = "";
          lineEl.classList.remove("is-live");
          subEl.classList.remove("is-live");
        })
        .catch(function () { /* لا فيديو — نبقى على العرض التقديري */ });
    }

    function render() {
      var shots = stage.querySelectorAll(".teaser__shot");
      var segs = bar.querySelectorAll(".teaser__seg");
      if (!shots.length) return;

      shots.forEach(function (el, i) {
        el.classList.toggle("is-live", i === shot);
      });
      segs.forEach(function (el, i) {
        el.classList.remove("is-live", "is-done");
        if (i < shot) el.classList.add("is-done");
        if (i === shot && playing) el.classList.add("is-live");
        if (i === shot && !playing) el.classList.add("is-done");
      });

      var s = EPISODES[ep].shots[shot];
      lineEl.classList.remove("is-live");
      subEl.classList.remove("is-live");
      // إعادة تشغيل الحركة بعد إطار واحد
      requestAnimationFrame(function () {
        lineEl.textContent = s.line || "";
        subEl.textContent = s.sub || "";
        requestAnimationFrame(function () {
          lineEl.classList.add("is-live");
          if (s.sub) subEl.classList.add("is-live");
        });
      });
    }

    function advance() {
      var total = EPISODES[ep].shots.length;
      shot += 1;
      if (shot >= total) {
        shot = 0;
        var nextEp = (ep + 1) % EPISODES.length;
        buildEpisode(nextEp);
        return;
      }
      render();
      if (playing) schedule();
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(advance, SHOT_MS);
    }
    function stop() { clearTimeout(timer); }

    if (playBtn) {
      playBtn.addEventListener("click", function () {
        playing = !playing;
        playBtn.textContent = playing ? "⏸" : "▶";
        playBtn.setAttribute("aria-label", playing ? "إيقاف" : "تشغيل");
        if (playing) { render(); schedule(); } else { stop(); render(); }
      });
      playBtn.textContent = playing ? "⏸" : "▶";
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () { stop(); advance(); });
    }
    epBtns.forEach(function (b, i) {
      b.addEventListener("click", function () { stop(); buildEpisode(i); });
    });

    // لا نشغّل إلا عند الظهور على الشاشة — توفير للموارد
    var player = document.querySelector(".teaser");
    if (player && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            if (playing) schedule();
          } else {
            stop();
          }
        });
      }, { threshold: 0.25 }).observe(player);
    }

    buildEpisode(0);
    if (reduced) { playing = false; stop(); }
  }
})();
