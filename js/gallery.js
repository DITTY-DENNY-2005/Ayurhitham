/* Public gallery loaded from the PHP/MySQL gallery API. */
(function(){
  "use strict";
  var grid = document.getElementById("gallery-grid");
  if (!grid) return;

  var state = { files: [], index: 0 };

  function skeletons(count){
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var item = document.createElement("div");
      item.className = "gallery-item skeleton";
      item.setAttribute("aria-hidden", "true");
      fragment.appendChild(item);
    }
    grid.replaceChildren(fragment);
  }

  function emptyState(message){
    var wrapper = document.createElement("div");
    wrapper.className = "gallery-state";
    var paragraph = document.createElement("p");
    paragraph.style.margin = "0";
    paragraph.textContent = message;
    wrapper.appendChild(paragraph);
    grid.replaceChildren(wrapper);
  }

  function openLightbox(index){
    var lightbox = document.getElementById("lightbox");
    var image = document.getElementById("lightbox-img");
    if (!lightbox || !image || !state.files[index]) return;
    state.index = index;
    image.src = state.files[index].url;
    image.alt = state.files[index].original_name;
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox(){
    var lightbox = document.getElementById("lightbox");
    if (!lightbox) return;
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }

  function step(direction){
    if (!state.files.length) return;
    openLightbox((state.index + direction + state.files.length) % state.files.length);
  }

  function render(files){
    state.files = files;
    if (!files.length) {
      emptyState("No photos have been added to the gallery yet.");
      return;
    }

    var fragment = document.createDocumentFragment();
    files.forEach(function(file, index){
      var caption = file.original_name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      var figure = document.createElement("figure");
      figure.className = "gallery-item reveal in";
      figure.setAttribute("data-index", String(index));
      var image = document.createElement("img");
      image.src = file.url;
      image.alt = caption;
      image.loading = "lazy";
      var figcaption = document.createElement("figcaption");
      figcaption.className = "cap";
      figcaption.textContent = caption;
      figure.appendChild(image);
      figure.appendChild(figcaption);
      figure.addEventListener("click", function(){ openLightbox(index); });
      fragment.appendChild(figure);
    });
    grid.replaceChildren(fragment);
  }

  document.addEventListener("click", function(event){
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("#lightbox-close")) closeLightbox();
    if (target.closest("#lightbox-prev")) step(-1);
    if (target.closest("#lightbox-next")) step(1);
    if (target.id === "lightbox") closeLightbox();
  });
  document.addEventListener("keydown", function(event){
    var lightbox = document.getElementById("lightbox");
    if (!lightbox || !lightbox.classList.contains("open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });

  skeletons(8);
  fetch("api/gallery.php?type=gallery", { headers: { "Accept": "application/json" } })
    .then(function(response){
      if (!response.ok) throw new Error("Gallery API returned " + response.status);
      return response.json();
    })
    .then(function(data){ render(Array.isArray(data.images) ? data.images : []); })
    .catch(function(){
      emptyState("The gallery couldn't be loaded right now. Please try again later.");
    });
})();
