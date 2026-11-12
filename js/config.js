/* =========================================================
   GALLERY STORAGE CONFIG
   -----------------------------------------------------------
   This file is PUBLIC — anyone viewing the site can read it.
   Never put a GitHub token in this file.

   Create a public GitHub repository to hold the gallery images,
   then fill in the three values below. Both gallery.html (public
   viewing) and admin.html (upload/delete) read this same config,
   so you only need to set it once.
   ========================================================= */
window.GALLERY_CONFIG = {
  owner:  "YOUR-GITHUB-USERNAME",   // e.g. "ayurhitham"
  repo:   "YOUR-REPO-NAME",        // e.g. "ayurhitham-gallery"
  branch: "main",                  // the repo's default branch
  path:   "gallery-images"         // folder inside the repo that holds images
};
