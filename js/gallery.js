/* =========================================================
   PUBLIC GALLERY
   Reads image files straight from the GitHub repo configured in
   config.js. No backend, no database — GitHub's Contents API
   (read-only, unauthenticated) is the "database".
   ========================================================= */
(function(){
  "use strict";
  var cfg = window.GALLERY_CONFIG || {};
  var grid = document.getElementById("gallery-grid");
  if (!grid) return;

  var IMAGE_RX = /\.(jpe?g|png|webp|gif|avif)$/i;

  function apiUrl(){
    return "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo +
           "/contents/" + encodeURIComponent(cfg.path).replace(/%2F/g,"/") +
           "?ref=" + encodeURIComponent(cfg.branch) + "&t=" + Date.now();
  }

  function skeletons(n){
    var html = "";
    for (var i=0;i<n;i++) html += '<div class="gallery-item skeleton" aria-hidden="true"></div>';
    return html;
  }

  function emptyState(msg, isError){
    grid.innerHTML =
      '<div class="gallery-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h10"/></svg>' +
        '<p style="margin:0">' + msg + '</p>' +
        (isError ? '<p style="font-size:.82rem;margin-top:6px">Check js/config.js — the repo owner, name and folder path must match a public GitHub repository.</p>' : '') +
      '</div>';
  }

  var state = { files: [], index: 0 };

  function openLightbox(i){
    var lb = document.getElementById("lightbox");
    var img = document.getElementById("lightbox-img");
    if (!lb || !img) return;
    state.index = i;
    img.src = state.files[i].download_url;
    img.alt = state.files[i].name;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox(){
    var lb = document.getElementById("lightbox");
    if (!lb) return;
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }
  function step(dir){
    if (!state.files.length) return;
    state.index = (state.index + dir + state.files.length) % state.files.length;
    openLightbox(state.index);
  }

  function render(files){
    if (!files.length){
      emptyState("No photos have been added to the gallery yet.");
      return;
    }
    state.files = files;
    grid.innerHTML = files.map(function(f, i){
      return '<figure class="gallery-item reveal" data-index="' + i + '">' +
               '<img src="' + f.download_url + '" alt="' + f.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," ") + '" loading="lazy">' +
               '<figcaption class="cap">' + f.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," ") + '</figcaption>' +
             '</figure>';
    }).join("");

    grid.querySelectorAll(".gallery-item").forEach(function(el){
      el.addEventListener("click", function(){ openLightbox(parseInt(el.getAttribute("data-index"),10)); });
      el.classList.add("in"); // images arrive after load; show immediately
    });
  }

  function load(){
    grid.innerHTML = skeletons(8);
    fetch(apiUrl(), { headers: { "Accept":"application/vnd.github+json" } })
      .then(function(res){
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok) throw new Error("api-error");
        return res.json();
      })
      .then(function(data){
        var files = (Array.isArray(data) ? data : [])
          .filter(function(f){ return f.type === "file" && IMAGE_RX.test(f.name); })
          .sort(function(a,b){ return a.name.localeCompare(b.name); });
        render(files);
      })
      .catch(function(err){
        if (err.message === "not-found"){
          emptyState("No photos have been added to the gallery yet.");
        } else {
          emptyState("The gallery couldn't be loaded right now.", true);
        }
      });
  }

  /* Lightbox controls */
  document.addEventListener("click", function(e){
    if (e.target.closest("#lightbox-close")) closeLightbox();
    if (e.target.closest("#lightbox-prev")) step(-1);
    if (e.target.closest("#lightbox-next")) step(1);
    if (e.target.id === "lightbox") closeLightbox();
  });
  document.addEventListener("keydown", function(e){
    var lb = document.getElementById("lightbox");
    if (!lb || !lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  load();
})();
