# Ayurhitham — Ayurveda Wellness Hospital website

A static HTML/CSS/JS site. No build step, no backend, no database.

## Files
```
index.html          Home
about.html           About
departments.html     Departments
treatments.html      Treatments
team.html            Our Team
gallery.html         Gallery (public — reads photos from GitHub)
admin.html           Gallery manager (private — add/remove photos)
contact.html         Contact (address + Google Map, no contact form)
book.html            Book Now (sends the request via WhatsApp)
css/style.css        All styling
js/main.js           Navigation, animations, scroll reveal, WhatsApp button
js/config.js         Gallery storage settings (edit this first — see below)
js/gallery.js        Public gallery loader
js/admin.js          Admin upload/delete logic
assets/logo-placeholder.svg   Placeholder mark — replace with the real logo
```

## 1. Add the real logo
No logo file came through with this request, so a simple placeholder mark is
used in the header and footer (`assets/logo-placeholder.svg`). Drop the real
logo file into `assets/` (e.g. `logo.svg` or `logo.png`) and replace every
`assets/logo-placeholder.svg` reference across the HTML files with its path.

## 2. Set up the Gallery (GitHub-backed, no database)
The Gallery page needed a way to add/remove photos without a server, so it
uses a GitHub repository as the storage:

1. Create a **public** GitHub repository (e.g. `ayurhitham-gallery`).
2. Open `js/config.js` and fill in:
   ```js
   window.GALLERY_CONFIG = {
     owner:  "your-github-username",
     repo:   "ayurhitham-gallery",
     branch: "main",
     path:   "gallery-images"
   };
   ```
   This file is public (anyone can view it) — it holds no secrets.
3. On GitHub, go to **Settings → Developer settings → Personal access
   tokens → Fine-grained tokens** and create one scoped to **only** that
   repository, with **Contents: Read and write** permission and nothing
   else. Set a short expiry and regenerate it periodically.
4. Open `admin.html` directly in a browser (it's deliberately not linked
   from the site menu), paste the token in, and click **Connect**. You can
   then drag and drop photos in, or remove existing ones.
5. The public `gallery.html` page needs no token — it only reads the
   repo's image list, which GitHub allows anonymously.

**Security note:** a token typed into `admin.html` is kept only in that
browser tab's session storage — it disappears when the tab is closed and is
never written to any file. Still, treat `admin.html`'s URL as private
(don't link to it publicly), use a token scoped to nothing but the gallery
repo, and avoid managing the gallery on a shared/public computer.

## 3. WhatsApp number
The floating WhatsApp button, the Contact page and the Book Now page all
link to `https://wa.me/918547478804` (+91 8547478804). The landline is
0471 2210119. To change the WhatsApp number, search for `918547478804`
across the HTML files and `book.html`'s script and replace it.

## 4. Address & map
The website lists the address as:
`Club Mahindra Road, Virali, Poovar, Uchakkada PO, Trivandrum`
and the email as `ayurhithamayurveda@gmail.com`. The Contact page embeds
Google Maps for this address using a key-free
`google.com/maps?...&output=embed` URL. No contact form is included there,
as requested — WhatsApp and phone are the two contact paths.

## 5. Book Now page
Since there's no backend to store bookings, the Book Now form builds a
pre-filled WhatsApp message from what the visitor enters and opens
WhatsApp with it ready to send — your front desk confirms the slot by
replying there.

## 6. Hosting
Any static host works (GitHub Pages, Netlify, Vercel, or a plain web
server) — just upload the whole folder as-is.
