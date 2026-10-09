/* ============================================================
   راديو الزمن الجميل
   ------------------------------------------------------------
   قيد تقني مهم: المتصفّحات (كروم، سفاري، فايرفوكس) تحجب تشغيل
   الصوت تلقائياً عند تحميل الصفحة. لا توجد حيلة تتجاوز ذلك،
   ولا يجب أن توجد. فالمشغّل هنا:
     1. يحاول التشغيل عند أول لمسة من الزائر (نقرة/مفتاح/لمس)
     2. يتذكّر اختياره في الجلسة فلا يُفرض عليه
     3. يبدأ بصوت منخفض ويتصاعد بهدوء — لا يفاجئ أحداً
   ============================================================ */
(function () {
  "use strict";

  /* قائمة التشغيل — ضع الملفّات في assets/audio/
     الأسماء هنا وصفيّة؛ بدّلها بما يناسب ترخيصك. */
  var PLAYLIST = [
    { file: "assets/audio/1414.mp3", title: "موسيقى الزمن الجميل" }
  ];

  var TARGET_VOL = 0.32;      // خلفيّة هادئة لا تطغى على الحديث
  var FADE_MS = 1400;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------- البناء */
  var box = document.createElement("div");
  box.className = "radio";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", "مشغّل موسيقى الخلفيّة");
  box.innerHTML =
    '<button class="radio__disc" id="rDisc" aria-label="تشغيل الموسيقى">' +
      '<img src="assets/img/logo.png" alt="">' +
      '<span class="radio__play" id="rPlayIcon">▶</span>' +
    "</button>" +
    '<span class="radio__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
    '<span class="radio__meta">' +
      '<span class="radio__label">راديو الزمن الجميل</span>' +
      '<span class="radio__track" id="rTrack">اضغط للتشغيل</span>' +
    "</span>" +
    (PLAYLIST.length > 1
      ? '<button class="radio__btn" id="rNext" aria-label="المقطع التالي">⏭</button>'
      : "") +
    '<button class="radio__btn" id="rOff" aria-label="إخفاء المشغّل">✕</button>';
  document.body.appendChild(box);

  var audio = new Audio();
  audio.preload = "none";
  audio.volume = 0;
  // مقطع واحد => تكرار مستمرّ بدل الانتقال
  if (PLAYLIST.length === 1) audio.loop = true;

  var disc = box.querySelector("#rDisc");
  var playIcon = box.querySelector("#rPlayIcon");
  var trackEl = box.querySelector("#rTrack");
  var nextBtn = box.querySelector("#rNext");
  var offBtn = box.querySelector("#rOff");

  var idx = 0;
  var playing = false;
  var available = null;       // null = لم نفحص بعد
  var fadeTimer = null;

  /* ---------------------------------------------- التخزين */
  function pref(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem("azj_" + key);
      sessionStorage.setItem("azj_" + key, val);
    } catch (e) { /* التخزين محجوب — نكمل بلا تذكّر */ }
    return null;
  }

  /* ---------------------------------------------- التلاشي */
  function fadeTo(target, done) {
    clearInterval(fadeTimer);
    var steps = reduced ? 1 : 28;
    var from = audio.volume;
    var i = 0;
    fadeTimer = setInterval(function () {
      i += 1;
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * (i / steps)));
      if (i >= steps) {
        clearInterval(fadeTimer);
        if (done) done();
      }
    }, FADE_MS / steps);
  }

  /* ---------------------------------------------- فحص توفّر الملفّات */
  function checkAvailable() {
    return fetch(PLAYLIST[0].file, { method: "HEAD" })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }

  function markMissing() {
    available = false;
    box.classList.add("is-missing");
    box.classList.remove("is-invite");
    trackEl.textContent = "لم تُضف الملفّات الصوتيّة بعد";
    disc.setAttribute("aria-label", "لا توجد ملفّات صوتيّة");
  }

  /* ---------------------------------------------- التشغيل */
  function load(i) {
    idx = (i + PLAYLIST.length) % PLAYLIST.length;
    audio.src = PLAYLIST[idx].file;
    trackEl.textContent = PLAYLIST[idx].title;
  }

  function play() {
    if (available === false) return;
    if (!audio.src) load(0);
    audio.volume = 0;
    var p = audio.play();
    if (p && p.catch) {
      p.then(function () {
        playing = true;
        box.classList.add("is-playing");
        box.classList.remove("is-invite");
        playIcon.textContent = "⏸";
        disc.setAttribute("aria-label", "إيقاف الموسيقى");
        pref("music", "on");
        fadeTo(TARGET_VOL);
        syncVinyl();
      }).catch(function () {
        // إمّا الملفّ غير موجود، أو المتصفّح منع التشغيل
        checkAvailable().then(function (ok) {
          if (!ok) markMissing();
        });
      });
    }
  }

  function pause() {
    fadeTo(0, function () {
      audio.pause();
      playing = false;
      box.classList.remove("is-playing");
      playIcon.textContent = "▶";
      disc.setAttribute("aria-label", "تشغيل الموسيقى");
      pref("music", "off");
      syncVinyl();
    });
  }

  function toggle() { playing ? pause() : play(); }

  /* ---------------------------------------------- الأسطوانة الكبيرة */
  function syncVinyl() {
    var v = document.getElementById("vinyl");
    if (!v) return;
    v.classList.toggle("is-paused", !playing);
  }

  /* ---------------------------------------------- الأحداث */
  disc.addEventListener("click", toggle);
  if (nextBtn) nextBtn.addEventListener("click", function () {
    load(idx + 1);
    if (playing) { audio.play().then(function () { fadeTo(TARGET_VOL); }).catch(function(){}); }
    else play();
  });
  offBtn.addEventListener("click", function () {
    pause();
    box.classList.remove("is-ready");
    pref("music", "hidden");
  });
  audio.addEventListener("ended", function () {
    load(idx + 1);
    audio.play().then(function () { fadeTo(TARGET_VOL); }).catch(function(){});
  });
  audio.addEventListener("error", function () {
    if (available !== false) checkAvailable().then(function (ok) { if (!ok) markMissing(); });
  });

  // الأسطوانة الكبيرة في قسم الفرن تتحكّم بالمشغّل نفسه
  document.addEventListener("click", function (e) {
    var v = e.target.closest && e.target.closest("#vinyl");
    if (v) toggle();
  });

  /* ---------------------------------------------- البدء عند أول لمسة */
  function firstGesture() {
    document.removeEventListener("pointerdown", firstGesture);
    document.removeEventListener("keydown", firstGesture);
    document.removeEventListener("touchstart", firstGesture);
    if (pref("music") === "off" || pref("music") === "hidden") return;
    play();
  }

  function boot() {
    if (pref("music") === "hidden") return;

    checkAvailable().then(function (ok) {
      available = ok;
      box.classList.add("is-ready");
      if (!ok) { markMissing(); return; }
      load(0);
      if (!reduced) box.classList.add("is-invite");
      document.addEventListener("pointerdown", firstGesture, { once: false });
      document.addEventListener("keydown", firstGesture, { once: false });
      document.addEventListener("touchstart", firstGesture, { once: false, passive: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
