/* The Canadian Panjabi 9-5 Exit Plan: interactions and lead capture
   nav · progress · reveal · checklist · faq · sticky bar · lead forms · Calendly · exit offer · analytics */
(function () {
  "use strict";

  /* =====================================================================
     SITE CONFIG: fill these in once. Everything below reads from here.
     ===================================================================== */
  const SITE_CONFIG = {
    calendly: "https://calendly.com/gurshanafpi/30min",
    // Where lead-form emails are POSTed as JSON { email, source, page, utm_* }.
    // Works with Formspree ("https://formspree.io/f/xxxx"), Make/Zapier webhooks, or your own endpoint.
    formEndpoint: "",
    // If formEndpoint is empty, submissions fall back to opening the visitor's mail app to this address.
    fallbackEmail: "",
    // Analytics (optional). Events fired: lead_submit, book_call_click, calendly_scheduled.
    ga4Id: "",
    metaPixelId: "",
    // Real client stories only. The section stays hidden until this array has entries.
    // Get written permission, keep quotes in the client's own words, and link a screenshot if you have one.
    // Example:
    // { name: "Harpreet S.", meta: "Brampton, ON · former security guard", result: "$1,200 first month",
    //   quote: "I booked the call on a night shift. Three weeks later a guy from my gurdwara paid me to fix his resume and interview prep.",
    //   photo: "assets/clients/harpreet.jpg", proof: "https://..." }
    testimonials: [],
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  /* ---------- attribution: keep UTM params for the whole visit ---------- */
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const params = new URLSearchParams(location.search);
  const utm = store.get("exitplan.utm", {});
  UTM_KEYS.forEach((k) => { if (params.get(k)) utm[k] = params.get(k); });
  if (Object.keys(utm).length) store.set("exitplan.utm", utm);

  /* ---------- analytics (only if IDs are set) ---------- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src; el.async = true;
      el.onload = resolve; el.onerror = reject;
      document.head.appendChild(el);
    });
  }
  if (SITE_CONFIG.ga4Id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", SITE_CONFIG.ga4Id);
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(SITE_CONFIG.ga4Id)).catch(() => {});
  }
  if (SITE_CONFIG.metaPixelId) {
    const n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    loadScript("https://connect.facebook.net/en_US/fbevents.js").then(() => {
      window.fbq("init", SITE_CONFIG.metaPixelId);
      window.fbq("track", "PageView");
    }).catch(() => {});
  }
  function track(name, data = {}) {
    if (typeof window.gtag === "function") window.gtag("event", name, data);
    if (typeof window.fbq === "function") {
      if (name === "lead_submit" || name === "calendly_scheduled") window.fbq("track", "Lead", data);
      else window.fbq("trackCustom", name, data);
    }
  }

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
  }

  /* ---------- Calendly URL builder (prefill + attribution) ---------- */
  function calendlyUrl(extra = {}) {
    const u = new URL(SITE_CONFIG.calendly);
    const email = store.get("exitplan.lead.email", "");
    if (email) u.searchParams.set("email", email);
    Object.entries(utm).forEach(([k, v]) => u.searchParams.set(k, v));
    if (!u.searchParams.get("utm_source")) u.searchParams.set("utm_source", "exit-plan-site");
    Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  }
  function refreshCalendlyLinks() {
    $$("[data-calendly-link]").forEach((a) => { a.href = calendlyUrl(); });
  }
  refreshCalendlyLinks();
  $$("[data-calendly-link]").forEach((a) => a.addEventListener("click", () => track("book_call_click", { location: "direct_link" })));

  /* ---------- "Book" buttons scroll to the inline calendar ---------- */
  $$("[data-book]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = $("#book");
      if (!target) return;
      e.preventDefault();
      closeModal();
      setMenu(false);
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      track("book_call_click", { location: a.closest("section, header, footer, .modal, .sticky-bar")?.id || a.className || "unknown" });
      ensureCalendly();
    });
  });

  /* ---------- inline Calendly widget (loaded when the section is near) ---------- */
  const calWrap = $("#calendlyInline");
  let calendlyRequested = false;
  function ensureCalendly() {
    if (calendlyRequested || !calWrap) return;
    calendlyRequested = true;
    loadScript("https://assets.calendly.com/assets/external/widget.js").then(() => {
      if (!window.Calendly) throw new Error("Calendly unavailable");
      const host = document.createElement("div");
      host.className = "calendly-inline-widget";
      calWrap.appendChild(host);
      window.Calendly.initInlineWidget({
        url: calendlyUrl({ hide_gdpr_banner: "1", background_color: "ffffff", primary_color: "111111", text_color: "111111" }),
        parentElement: host,
      });
      calWrap.classList.add("is-loaded");
    }).catch(() => { calendlyRequested = false; /* fallback card stays visible */ });
  }
  if (calWrap && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { ensureCalendly(); io.disconnect(); }
    }, { rootMargin: "600px 0px" });
    io.observe(calWrap);
  } else if (calWrap) {
    ensureCalendly();
  }
  window.addEventListener("message", (e) => {
    if (!e.data || typeof e.data.event !== "string" || e.data.event.indexOf("calendly.") !== 0) return;
    if (e.data.event === "calendly.event_scheduled") {
      store.set("exitplan.booked", true);
      track("calendly_scheduled", {});
      const thanks = $("#thanks");
      if (thanks) { thanks.hidden = false; thanks.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); }
    }
  });

  /* ---------- lead forms (PDF section + exit offer) ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function leadPayload(email, source) {
    const scenario = store.get("exitplan.scenario", null);
    return Object.assign({ email, source, page: location.href, ts: new Date().toISOString(), form_name: "exit-plan-pdf" }, utm, scenario ? { scenario } : {});
  }
  async function sendLead(payload) {
    if (!SITE_CONFIG.formEndpoint) return { ok: false, reason: "no-endpoint" };
    try {
      const res = await fetch(SITE_CONFIG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: res.ok, reason: res.ok ? "" : "http-" + res.status };
    } catch {
      return { ok: false, reason: "network" };
    }
  }
  function queueLead(payload) {
    const q = store.get("exitplan.lead.queue", []);
    q.push(payload);
    store.set("exitplan.lead.queue", q.slice(-20));
  }
  async function flushQueue() {
    if (!SITE_CONFIG.formEndpoint) return;
    const q = store.get("exitplan.lead.queue", []);
    if (!q.length) return;
    const remaining = [];
    for (const p of q) { const r = await sendLead(p); if (!r.ok) remaining.push(p); }
    store.set("exitplan.lead.queue", remaining);
  }
  flushQueue();

  $$("[data-lead-form]").forEach((form) => {
    const input = $("input[type=email]", form);
    const msg = $(".lead-form__msg", form);
    const btn = $("button[type=submit]", form);
    const source = form.closest(".modal") ? "exit-offer" : "pdf-section";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (input.value || "").trim();
      if (!EMAIL_RE.test(email)) {
        input.setAttribute("aria-invalid", "true");
        msg.classList.add("is-error");
        msg.textContent = "Enter a valid email address so the PDF can reach you.";
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      msg.classList.remove("is-error");
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Sending…";

      store.set("exitplan.lead.email", email);
      refreshCalendlyLinks();
      const payload = leadPayload(email, source);
      const result = await sendLead(payload);
      track("lead_submit", { source, delivered: result.ok });

      form.classList.add("is-done");
      if (result.ok) {
        msg.textContent = "Done. The PDF is on its way to " + email + ". Want it faster? Book your free call below and we go through it together.";
      } else {
        // Never lose the lead: keep it locally for retry, and hand it to the mail app or Calendly right away.
        queueLead(payload);
        if (SITE_CONFIG.fallbackEmail) {
          const mail = "mailto:" + SITE_CONFIG.fallbackEmail + "?subject=" + encodeURIComponent("Send me the 9-5 Exit Plan PDF") + "&body=" + encodeURIComponent("Please send the PDF to " + email);
          window.location.href = mail;
          msg.textContent = "Your mail app is opening with the request ready. Hit send and the PDF follows.";
        } else {
          msg.textContent = "Saved. Pick a time for your free call and the PDF comes with the calendar invite.";
        }
      }
      btn.disabled = false;
      btn.textContent = original;
      store.set("exitplan.lead.captured", true);
      setTimeout(() => {
        if (form.closest(".modal")) { closeModal(); }
        const bookEl = $("#book");
        if (bookEl) { bookEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); ensureCalendly(); }
      }, result.ok ? 1800 : 1200);
    });
  });

  /* ---------- exit-intent / scroll-depth offer (once per session) ---------- */
  const modal = $("#exitModal");
  let modalOpen = false;
  function shouldOffer() {
    if (!modal) return false;
    if (store.get("exitplan.lead.captured", false) || store.get("exitplan.booked", false)) return false;
    if (store.sget("exitplan.offer.shown")) return false;
    return true;
  }
  function openModal() {
    if (!shouldOffer() || modalOpen) return;
    modalOpen = true;
    store.sset("exitplan.offer.shown", "1");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const input = $("input[type=email]", modal);
    if (input && window.innerWidth > 820) setTimeout(() => input.focus(), 50);
    track("exit_offer_shown", {});
    onScroll();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modalOpen = false;
    document.body.style.overflow = "";
    onScroll();
  }
  if (modal) {
    $$("[data-modal-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); setMenu(false); } });
    // desktop: cursor leaves through the top of the window
    document.addEventListener("mouseout", (e) => {
      if (e.relatedTarget || e.clientY > 10) return;
      if (window.innerWidth > 820 && window.scrollY > 300) openModal();
    });
    // mobile and desktop: deep scroll without acting, or a long idle read
    let deepScrollTimer = null;
    window.addEventListener("scroll", () => {
      const depth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (depth > 0.62 && !deepScrollTimer) deepScrollTimer = setTimeout(openModal, 4000);
    }, { passive: true });
    setTimeout(openModal, 75000);
  }


  /* ---------- client stories (only real, permissioned quotes) ---------- */
  (function renderStories() {
    const section = $("#stories");
    const grid = $("#storiesGrid");
    const list = Array.isArray(SITE_CONFIG.testimonials) ? SITE_CONFIG.testimonials.filter((t) => t && t.quote && t.name) : [];
    if (!section || !grid || !list.length) return;
    const esc = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    grid.innerHTML = list.map((t) => {
      const initials = esc(t.name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase());
      const avatar = t.photo ? `<img class="story__avatar" src="${esc(t.photo)}" alt="" width="44" height="44" loading="lazy" />` : `<span class="story__avatar" aria-hidden="true">${initials}</span>`;
      const result = t.result ? `<p class="story__result">${esc(t.result)}</p>` : "";
      const proof = t.proof ? ` · <a href="${esc(t.proof)}" target="_blank" rel="noopener">See proof</a>` : "";
      return `<article class="story">${result}<blockquote class="story__quote">${esc(t.quote)}</blockquote><div class="story__who">${avatar}<div><p class="story__name">${esc(t.name)}</p><p class="story__meta">${esc(t.meta || "")}${proof}</p></div></div></article>`;
    }).join("");
    const note = document.createElement("p");
    note.className = "stories__note";
    note.textContent = "Shared with permission. Individual results vary and depend on effort, niche and consistency.";
    grid.after(note);
    section.hidden = false;
    const fitNote = $(".fit__note");
    if (fitNote) fitNote.textContent = "These are examples of who the guide is written for, not client results. Real client stories are below.";
  })();


  /* ---------- do your own math: live scenario calculator ---------- */
  (function calculator() {
    const form = $("#calcForm");
    const svg = $("#calcChart");
    if (!form || !svg) return;
    const ins = { wage: $("#inWage"), hours: $("#inHours"), price: $("#inPrice"), clients: $("#inClients"), rate: $("#inRate") };
    const outs = { wage: $("#outWage"), hours: $("#outHours"), price: $("#outPrice"), clients: $("#outClients"), rate: $("#outRate") };
    const money = (n) => "$" + Math.round(n).toLocaleString("en-CA");
    const CONTENT_HOURS = 7; // 1 hour a day
    const HOURS_PER_CLIENT = 1;
    const ns = "http://www.w3.org/2000/svg";
    let lastMonth = null;

    function setText(el, text, bump = true) {
      if (!el || el.textContent === text) return;
      el.textContent = text;
      if (bump && !reduceMotion) { el.classList.remove("num-bump"); void el.offsetWidth; el.classList.add("num-bump"); }
    }
    function paintTrack(input) {
      const min = +input.min, max = +input.max, v = +input.value;
      input.style.setProperty("--pct", ((v - min) / (max - min)) * 100 + "%");
    }
    function scenario() {
      const wage = +ins.wage.value, hours = +ins.hours.value, price = +ins.price.value, target = +ins.clients.value, rate = +ins.rate.value;
      const job = wage * hours * 52 / 12;
      const months = [];
      let exit = null, year = 0;
      for (let m = 1; m <= 12; m++) {
        const clients = Math.min(target, Math.max(0, m - 1) * rate);
        const income = clients * price;
        year += income;
        if (exit === null && income >= job && income > 0) exit = m;
        months.push({ m, clients, income });
      }
      const coachHours = target * HOURS_PER_CLIENT + CONTENT_HOURS;
      const coachIncome = target * price;
      return { wage, hours, price, target, rate, job, months, exit, year, coachHours, coachIncome };
    }
    function drawChart(sc) {
      while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild); // keep <title>
      const W = 640, H = 260, padL = 8, padR = 8, padT = 26, padB = 30;
      const innerW = W - padL - padR, innerH = H - padT - padB;
      const maxV = Math.max(sc.job * 1.15, ...sc.months.map((x) => x.income)) || 1;
      const gap = 10, bw = (innerW - gap * 11) / 12;
      const y = (v) => padT + innerH - (v / maxV) * innerH;
      const mk = (tag, attrs) => { const el = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); return el; };
      // bars
      sc.months.forEach((pt, i) => {
        const x = padL + i * (bw + gap);
        const top = y(pt.income);
        const over = pt.income >= sc.job && pt.income > 0;
        const bar = mk("rect", { class: "bar", x, y: Math.min(top, padT + innerH - 3), width: bw, height: Math.max(3, padT + innerH - top), rx: 6, fill: over ? "#fbbf24" : "rgba(255,255,255,0.28)" });
        svg.appendChild(bar);
        const lbl = mk("text", { x: x + bw / 2, y: H - 10, "text-anchor": "middle", "font-size": "11", fill: "rgba(255,255,255,0.6)", "font-weight": "600" });
        lbl.textContent = pt.m; svg.appendChild(lbl);
        if (pt.income > 0 && (i === 11 || pt.m === sc.exit)) {
          const v = mk("text", { x: x + bw / 2, y: top - 8, "text-anchor": "middle", "font-size": "12", fill: over ? "#fbbf24" : "#fff", "font-weight": "700" });
          v.textContent = money(pt.income); svg.appendChild(v);
        }
      });
      // job line
      const jy = y(sc.job);
      svg.appendChild(mk("line", { x1: padL, x2: W - padR, y1: jy, y2: jy, stroke: "#e0342f", "stroke-width": 1.5, "stroke-dasharray": "5 5" }));
      const jl = mk("text", { x: W - padR, y: jy - 7, "text-anchor": "end", "font-size": "12", fill: "#ff6b66", "font-weight": "600" });
      jl.textContent = "Your job · " + money(sc.job) + " / mo"; svg.appendChild(jl);
      const axis = mk("text", { x: padL, y: H - 10, "font-size": "11", fill: "rgba(255,255,255,0.45)", "text-anchor": "start" });
      axis.textContent = ""; svg.appendChild(axis);
    }
    function render() {
      Object.values(ins).forEach(paintTrack);
      const sc = scenario();
      outs.wage.textContent = "$" + sc.wage.toFixed(2);
      outs.hours.textContent = sc.hours + " hrs";
      outs.price.textContent = money(sc.price);
      outs.clients.textContent = sc.target + (sc.target === 1 ? " customer" : " customers");
      outs.rate.textContent = sc.rate + " a month";

      const hook = $("#calcHook");
      if (sc.exit) {
        hook.classList.remove("is-never");
        setText($("#hookMonth"), "Month " + sc.exit, sc.exit !== lastMonth);
        setText($("#hookSub"), "with " + sc.months[sc.exit - 1].clients + " customers paying " + money(sc.price) + " a month. Your job pays " + money(sc.job) + ".", false);
      } else {
        hook.classList.add("is-never");
        const need = Math.ceil(sc.job / sc.price);
        setText($("#hookMonth"), "Not within 12 months at these numbers", true);
        setText($("#hookSub"), "You'd need about " + need + " customers at " + money(sc.price) + ", or a higher price. Try moving the sliders.", false);
      }
      lastMonth = sc.exit;
      setText($("#tileJob"), money(sc.job));
      setText($("#tileJobSub"), "a month · " + sc.hours + " hrs a week", false);
      setText($("#tileCoach"), money(sc.coachIncome));
      setText($("#tileCoachSub"), "a month · " + sc.coachHours.toFixed(1).replace(/\.0$/, "") + " hrs a week", false);
      setText($("#factYear"), money(sc.year));
      const back = sc.hours - sc.coachHours;
      setText($("#factHours"), (back > 0 ? back.toFixed(1).replace(/\.0$/, "") : "0") + " hrs");
      const perHour = sc.coachIncome / (sc.coachHours * 52 / 12);
      setText($("#factPerHour"), money(perHour));
      setText($("#factWageCmp"), "$" + sc.wage.toFixed(2), false);
      drawChart(sc);
      store.set("exitplan.scenario", { wage: sc.wage, hours: sc.hours, price: sc.price, clients: sc.target, rate: sc.rate, job: Math.round(sc.job), coaching: sc.coachIncome, exit_month: sc.exit, year1: Math.round(sc.year) });
    }
    Object.values(ins).forEach((el) => el.addEventListener("input", render));
    render();
    let tracked = false;
    form.addEventListener("input", () => { if (!tracked) { tracked = true; track("calc_used", {}); } });
  })();



  /* ---------- videos: only one plays at a time ---------- */
  const videos = $$("video");
  videos.forEach((v) => v.addEventListener("play", () => {
    videos.forEach((o) => { if (o !== v && !o.paused) o.pause(); });
    track("video_play", { video: v.getAttribute("aria-label") || "" });
  }));

  /* ---------- reading progress + nav shadow + sticky bar ---------- */
  const bar = $("#progressBar");
  const sticky = $("#stickyCta");
  const hero = $("#top");
  const book = $("#book");
  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    if (nav) nav.classList.toggle("is-scrolled", y > 24);
    if (sticky && hero && book) {
      const pastHero = y > hero.offsetTop + hero.offsetHeight - 80;
      const nearBook = book.getBoundingClientRect().top < window.innerHeight * 0.85;
      const small = window.innerWidth <= 820;
      const show = small && pastHero && !nearBook && !modalOpen;
      sticky.classList.toggle("is-visible", show);
      sticky.setAttribute("aria-hidden", String(!show));
      $$("a", sticky).forEach((a) => { a.tabIndex = show ? 0 : -1; });
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- active nav link ---------- */
  const links = $$(".nav__links a");
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- scroll reveal ---------- */
  const reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- checklist with local persistence ---------- */
  const KEY = "exitplan.checklist.v1";
  const boxes = $$("#checklist input[type=checkbox]");
  const count = $("#checkCount");
  function updateCount() {
    if (!count) return;
    const done = boxes.filter((b) => b.checked).length;
    count.textContent = done === boxes.length && boxes.length ? "All set. Book your free call." : `${done} / ${boxes.length} ready`;
  }
  if (boxes.length) {
    const state = store.get(KEY, {});
    boxes.forEach((b) => {
      b.checked = Boolean(state[b.dataset.key]);
      b.addEventListener("change", () => {
        const s = store.get(KEY, {});
        s[b.dataset.key] = b.checked;
        store.set(KEY, s);
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
})();
