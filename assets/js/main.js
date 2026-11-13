/* «Бабушкин сундучок» — интерактив без зависимостей */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Мобильное меню ---------- */

  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Прогресс чтения ---------- */

  var bar = document.querySelector(".progress");

  function updateProgress() {
    if (!bar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var value = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, value)) + ")";
  }

  /* ---------- Появление блоков ---------- */

  var revealItems = document.querySelectorAll("[data-reveal]");

  if (revealItems.length && "IntersectionObserver" in window && !reduceMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* ---------- Подсветка содержания ---------- */

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));

  if (tocLinks.length && "IntersectionObserver" in window) {
    var sections = tocLinks
      .map(function (link) {
        return document.querySelector(link.getAttribute("href"));
      })
      .filter(Boolean);

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* ---------- Кнопка «наверх» ---------- */

  var toTop = document.querySelector(".to-top");

  function updateTopButton() {
    if (!toTop) return;
    toTop.classList.toggle("is-visible", window.scrollY > 600);
  }

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        updateProgress();
        updateTopButton();
        ticking = false;
      });
    },
    { passive: true }
  );

  updateProgress();
  updateTopButton();

  /* ---------- Лайтбокс ---------- */

  var dialog = document.querySelector(".lightbox");
  var dialogImage = dialog ? dialog.querySelector("img") : null;
  var dialogCaption = dialog ? dialog.querySelector("figcaption") : null;
  var lastFocused = null;

  function openLightbox(source) {
    if (!dialog || !dialogImage) return;
    lastFocused = document.activeElement;
    dialogImage.src = source.getAttribute("src");
    dialogImage.alt = source.getAttribute("alt") || "";
    if (dialogCaption) {
      dialogCaption.textContent = source.getAttribute("data-caption") || source.getAttribute("alt") || "";
    }
    dialog.setAttribute("open", "");
    document.body.style.overflow = "hidden";
    var close = dialog.querySelector(".lightbox-close");
    if (close) close.focus();
  }

  function closeLightbox() {
    if (!dialog) return;
    dialog.removeAttribute("open");
    document.body.style.overflow = "";
    if (dialogImage) dialogImage.removeAttribute("src");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  document.querySelectorAll("img[data-lightbox], [data-lightbox] img").forEach(function (image) {
    image.setAttribute("tabindex", "0");
    image.setAttribute("role", "button");

    image.addEventListener("click", function () {
      openLightbox(image);
    });

    image.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(image);
      }
    });
  });

  // Клик по подписи плитки тоже открывает снимок
  document.querySelectorAll(".shot").forEach(function (tile) {
    tile.addEventListener("click", function (event) {
      if (event.target === tile || event.target.closest("figcaption")) {
        var image = tile.querySelector("img");
        if (image) openLightbox(image);
      }
    });
  });

  if (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog || event.target.closest(".lightbox-close")) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && dialog.hasAttribute("open")) closeLightbox();
    });
  }

  /* ---------- Копирование промптов ---------- */

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = document.querySelector(button.getAttribute("data-copy"));
      if (!target) return;
      var text = target.textContent.trim();
      var done = function () {
        var original = button.textContent;
        button.textContent = "Скопировано";
        window.setTimeout(function () {
          button.textContent = original;
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          fallbackCopy(text, done);
        });
      } else {
        fallbackCopy(text, done);
      }
    });
  });

  function fallbackCopy(text, done) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (error) {
      /* тихо игнорируем */
    }
    document.body.removeChild(area);
  }

  /* ---------- Год в подвале ---------- */

  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });
})();
