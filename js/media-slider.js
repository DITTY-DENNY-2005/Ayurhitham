(function(){
  "use strict";

  document.querySelectorAll("[data-media-slider]").forEach(function(slider){
    var collection = slider.getAttribute("data-collection");
    var track = slider.querySelector("[data-slider-track]");
    var status = slider.querySelector("[data-slider-status]");
    var previous = slider.querySelector("[data-slide-prev]");
    var next = slider.querySelector("[data-slide-next]");

    function move(direction){
      var firstSlide = track.firstElementChild;
      if (!firstSlide) return;
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 0;
      track.scrollBy({
        left: direction * (firstSlide.getBoundingClientRect().width + gap),
        behavior: "smooth"
      });
    }

    function render(images){
      if (!images.length) {
        status.textContent = collection === "reviews"
          ? "Review photos will appear here once they are added from the admin dashboard."
          : "Homestay photos will appear here once they are added from the admin dashboard.";
        if (previous) previous.disabled = true;
        if (next) next.disabled = true;
        return;
      }

      var fragment = document.createDocumentFragment();
      images.forEach(function(image){
        var figure = document.createElement("figure");
        figure.className = "media-slide";
        var photo = document.createElement("img");
        photo.src = image.url;
        photo.alt = collection === "reviews"
          ? "Google review screenshot"
          : image.original_name;
        photo.loading = "lazy";
        photo.decoding = "async";
        figure.appendChild(photo);
        fragment.appendChild(figure);
      });
      track.replaceChildren(fragment);
      status.textContent = images.length + (collection === "reviews" ? " review photo(s)." : " homestay photo(s).");
      if (previous) previous.disabled = images.length < 2;
      if (next) next.disabled = images.length < 2;
    }

    if (previous) previous.addEventListener("click", function(){ move(-1); });
    if (next) next.addEventListener("click", function(){ move(1); });

    fetch("api/gallery.php?type=" + encodeURIComponent(collection), {
      headers: { "Accept": "application/json" }
    }).then(function(response){
      if (!response.ok) throw new Error("Could not load photos.");
      return response.json();
    }).then(function(data){
      render(Array.isArray(data.images) ? data.images : []);
    }).catch(function(){
      status.textContent = "Photos could not be loaded right now. Please try again later.";
    });
  });
})();
