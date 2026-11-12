/* =========================================================
   AYURHITHAM — shared site behaviour
   ========================================================= */
(function(){
  "use strict";

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var links  = document.querySelector(".nav-links");
  if (toggle && links){
    toggle.addEventListener("click", function(){
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", function(){
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded","false");
      });
    });
  }

  /* ---------- Active nav link ---------- */
  var here = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".nav-links a[href]").forEach(function(a){
    var href = a.getAttribute("href");
    if (href === here || (here === "" && href === "index.html")) a.classList.add("active");
  });

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header){
    window.addEventListener("scroll", function(){
      header.style.boxShadow = window.scrollY > 10 ? "0 10px 30px -22px rgba(23,41,31,.4)" : "none";
    }, { passive:true });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-stagger");
  if ("IntersectionObserver" in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.18, rootMargin:"0px 0px -60px 0px" });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add("in"); });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll(".counter[data-target]");
  if (counters.length){
    var animateCounter = function(el){
      var target = parseFloat(el.getAttribute("data-target"));
      var decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"),10) : 0;
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1600, start = null;
      function step(ts){
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window){
      var cio = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting){ animateCounter(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold:.6 });
      counters.forEach(function(c){ cio.observe(c); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---------- Page transition veil ----------
     A single curtain wipe between internal page loads — not used on every
     hover/click, only on genuine navigation, so it reads as one deliberate
     moment rather than a scattered effect. */
  var veil = document.createElement("div");
  veil.className = "page-veil";
  document.body.appendChild(veil);
  document.body.classList.add("is-loading");

  document.querySelectorAll('a[href]').forEach(function(a){
    var href = a.getAttribute("href");
    if (!href || href.indexOf("#") === 0 || href.indexOf("http") === 0 ||
        href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0 ||
        a.target === "_blank") return;
    a.addEventListener("click", function(e){
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      veil.classList.add("show");
      setTimeout(function(){ window.location.href = href; }, 420);
    });
  });

  /* ---------- Simple testimonial / stat marquee-free fade (if present) ---------- */
  var track = document.querySelector("[data-quote-track]");
  if (track){
    var items = track.children;
    var i = 0;
    if (items.length > 1){
      setInterval(function(){
        items[i].style.display = "none";
        i = (i + 1) % items.length;
        items[i].style.display = "";
      }, 5200);
    }
  }
})();
