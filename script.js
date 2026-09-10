/* The Canadian Panjabi 9-5 Exit Plan — interactions
   nav · progress · scroll reveal · checklist persistence · faq · sticky CTA */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- nav: scrolled state + mobile menu ---------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const menu = $("#mobileMenu");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
  }
  if (toggle) {
    toggle.addEventListener("click", () => setMenu(menu.hidden));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- reading progress + nav shadow + sticky CTA ---------- */
  const bar = $("#progressBar");
  const sticky = $("#stickyCta");
  const hero = $("#top");
  const cta = $("#book");

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    if (nav) nav.classList.toggle("is-scrolled", y > 24);

    if (sticky && hero && cta) {
      const pastHero = y > hero.offsetTop + hero.offsetHeight - 80;
      const ctaTop = cta.getBoundingClientRect().top;
      const nearCta = ctaTop < window.innerHeight * 0.85;
      const small = window.innerWidth <= 820;
      const show = small && pastHero && !nearCta;
      sticky.classList.toggle("is-visible", show);
      sticky.setAttribute("aria-hidden", String(!show));
      const link = sticky.querySelector("a");
      if (link) link.tabIndex = show ? 0 : -1;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- active nav link ---------- */
  const links = $$(".nav__links a");
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- scroll reveal ---------- */
  const reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- checklist with local persistence ---------- */
  const KEY = "exitplan.checklist.v1";
  const boxes = $$("#checklist input[type=checkbox]");
  const count = $("#checkCount");

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode etc. */ }
  }
  function updateCount() {
    if (!count) return;
    const done = boxes.filter((b) => b.checked).length;
    count.textContent = `${done} / ${boxes.length} ready`;
    if (done === boxes.length && boxes.length) count.textContent = "All set — go to Step 1";
  }
  if (boxes.length) {
    const state = load();
    boxes.forEach((b) => {
      b.checked = Boolean(state[b.dataset.key]);
      b.addEventListener("change", () => {
        const s = load();
        s[b.dataset.key] = b.checked;
        save(s);
        updateCount();
      });
    });
    updateCount();
  }

  /* ---------- faq: one open at a time ---------- */
  const faqs = $$("#faqList details");
  faqs.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      faqs.forEach((o) => { if (o !== d && o.open) o.open = false; });
    });
  });

  /* ---------- outbound click tracking hook (optional) ---------- */
  $$('a[href^="https://calendly.com"]').forEach((a) => {
    a.addEventListener("click", () => {
      if (typeof window.gtag === "function") window.gtag("event", "book_call_click", { location: a.closest("section, header, footer")?.id || "sticky" });
    });
  });
})();
