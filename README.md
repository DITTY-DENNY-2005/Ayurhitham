# Ayurhitham - Ayurveda Wellness Hospital website

The public pages are HTML/CSS/JavaScript. The gallery admin and gallery photo
storage use PHP and MySQL, so this site must run on a PHP-enabled web server;
opening the files directly or using static hosting alone will not run the
admin or load the gallery.

## Run locally with XAMPP

1. Install XAMPP with Apache, MySQL and PHP, and put this project folder under
   `C:\xampp\htdocs`.
2. Start Apache and MySQL in the XAMPP Control Panel.
3. In phpMyAdmin, create a database named `ayurhitham` using `utf8mb4`.
4. Copy `config.example.php` to `config.php`, then set `DB_HOST`, `DB_NAME`,
   `DB_USER` and `DB_PASSWORD` to match your MySQL account. For production,
   use a dedicated MySQL account with access only to this database; do not use
   the MySQL root account. `config.php` is ignored by Git so credentials are
   not added to commits.
5. In a command prompt, change to the project folder and run:
   ```text
   C:\xampp\php\php.exe create_admin.php
   ```
   Enter an admin username and a password of at least 12 characters. The
   script creates the tables and imports the three bundled gallery photos.
   On an existing installation, running it again adds the image collection
   field while leaving the existing admin account unchanged.
6. Visit `http://localhost/Ayurhitham-main/admin.php` and sign in. The public
   gallery is at `http://localhost/Ayurhitham-main/gallery.html`.

The PHP account running Apache must be able to write to `gallery-images`.
For uploads up to 8 MB, PHP's `upload_max_filesize` must be at least `8M` and
`post_max_size` must be greater than `8M`. Enable PDO MySQL and Fileinfo in
PHP. Use HTTPS when hosting the site publicly.

## Admin and gallery

`admin.php` authenticates against the `admin_users` MySQL table using
password hashes and PHP sessions. There is no public registration. The
dashboard uses a sidebar to open separate Gallery, Reviews, and Homestay
management pages (`admin.php?section=gallery`, `admin.php?section=reviews`,
and `admin.php?section=homestay`). It provides collections for the public gallery, Google review
screenshots shown in the home-page slider, and homestay photos shown on the
Homestay page. Upload real review screenshots only with the reviewer's
permission. JPG, PNG, WEBP, GIF and AVIF photos are supported; image metadata
is stored in the `gallery_images` table and the files live in
`gallery-images`. `api/gallery.php` serves the public image lists and checks
the signed-in session and CSRF token for upload and delete requests.

Do not expose database credentials, use a strong unique admin password, and
keep PHP and MySQL patched. Back up both the `gallery_images` table and the
`gallery-images` directory.

## Other site details

- The floating WhatsApp button, Contact page and Book Now page use
  `https://wa.me/918547478804` (+91 8547478804). The landline is 0471 2210119.
- The listed address is Club Mahindra Road, Virali, Poovar, Uchakkada PO,
  Trivandrum; the email is ayurhithamayurveda@gmail.com.
- Book Now opens WhatsApp with a pre-filled message; bookings are not stored
  by the site.
