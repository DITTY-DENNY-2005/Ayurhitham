<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
start_app_session();
header('Cache-Control: no-store');

$error = '';
$authenticated = isset($_SESSION['admin_id']);
$collections = [
    'gallery' => ['Gallery photos', 'Photos displayed on the public Gallery page.'],
    'reviews' => ['Google review photos', 'Upload screenshots of real Google reviews. They appear in the Reviews slider on the home page.'],
    'homestay' => ['Homestay photos', 'Photos displayed in the Homestay slider.'],
];
$requestedSection = $_GET['section'] ?? 'gallery';
$activeSection = is_string($requestedSection) && isset($collections[$requestedSection])
    ? $requestedSection
    : 'gallery';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!csrf_is_valid()) {
        $error = 'Your session expired. Refresh the page and try again.';
    } elseif (($_POST['action'] ?? '') === 'logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        header('Location: admin.php');
        exit;
    } elseif (!$authenticated && ($_POST['action'] ?? '') === 'login') {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        try {
            $statement = db()->prepare(
                'SELECT id, username, password_hash FROM admin_users WHERE username = :username LIMIT 1'
            );
            $statement->execute(['username' => $username]);
            $admin = $statement->fetch();
            if ($admin && password_verify($password, $admin['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['admin_id'] = (int) $admin['id'];
                $_SESSION['admin_username'] = $admin['username'];
                $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
                $authenticated = true;
            } else {
                $error = 'The username or password is incorrect.';
            }
        } catch (Throwable $exception) {
            error_log('Admin login error: ' . $exception->getMessage());
            $error = 'The admin database is unavailable. Check the PHP/MySQL setup.';
        }
    }
}

$csrfToken = htmlspecialchars((string) $_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8');
$username = htmlspecialchars((string) ($_SESSION['admin_username'] ?? ''), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gallery Admin - Ayurhitham</title>
<meta name="robots" content="noindex, nofollow">
<meta name="csrf-token" content="<?= $csrfToken ?>">
<link rel="icon" href="assets/logo.png" type="image/png">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="site-header">
  <nav class="nav">
    <a href="index.html" class="brand">
      <img src="assets/logo.png" alt="Ayurhitham" class="brand-mark">
      <span class="brand-word">Ayurhitham<small>Gallery Admin</small></span>
    </a>
    <div class="nav-cta">
      <a href="gallery.html" class="btn btn-line">View public gallery</a>
    </div>
  </nav>
</header>

<main class="section">
  <div class="container admin-shell">
    <?php if (!$authenticated): ?>
      <h1 style="margin-bottom:6px">Admin sign in</h1>
      <p class="lede">Sign in to manage photos in the public gallery.</p>
      <?php if ($error !== ''): ?>
        <p class="status-msg err" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
      <?php endif; ?>
      <form method="post" action="admin.php" class="admin-login">
        <input type="hidden" name="csrf_token" value="<?= $csrfToken ?>">
        <input type="hidden" name="action" value="login">
        <div class="field">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" autocomplete="username" required maxlength="80">
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" autocomplete="current-password" required>
        </div>
        <button type="submit" class="btn btn-gold">Sign in</button>
      </form>
    <?php else: ?>
      <div class="admin-heading">
        <div>
          <h1 style="margin-bottom:6px">Gallery manager</h1>
          <p class="lede">Signed in as <?= $username ?>. Manage public gallery photos, review screenshots and homestay photos.</p>
          <?php if ($error !== ''): ?>
            <p class="status-msg err" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
          <?php endif; ?>
        </div>
        <form method="post" action="admin.php">
          <input type="hidden" name="csrf_token" value="<?= $csrfToken ?>">
          <input type="hidden" name="action" value="logout">
          <button type="submit" class="btn btn-line">Sign out</button>
        </form>
      </div>

      <div class="admin-layout">
        <nav class="admin-sidebar" aria-label="Admin pages">
          <p class="admin-sidebar-label">Manage photos</p>
          <?php foreach ($collections as $collection => [$title, $description]): ?>
            <a href="admin.php?section=<?= rawurlencode($collection) ?>"
               class="admin-sidebar-link<?= $activeSection === $collection ? ' active' : '' ?>"
               <?= $activeSection === $collection ? 'aria-current="page"' : '' ?>>
              <span><?= htmlspecialchars(ucfirst($collection), ENT_QUOTES, 'UTF-8') ?></span>
              <small><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></small>
            </a>
          <?php endforeach; ?>
        </nav>

        <section class="admin-manager" data-media-manager data-collection="<?= htmlspecialchars($activeSection, ENT_QUOTES, 'UTF-8') ?>">
          <div class="admin-manager-heading">
            <div>
              <h2><?= htmlspecialchars($collections[$activeSection][0], ENT_QUOTES, 'UTF-8') ?></h2>
              <p><?= htmlspecialchars($collections[$activeSection][1], ENT_QUOTES, 'UTF-8') ?></p>
            </div>
            <button type="button" class="btn btn-line" data-refresh style="padding:10px 20px;font-size:.85rem">Refresh</button>
          </div>
          <div class="drop-zone" data-drop-zone role="button" tabindex="0" aria-label="Choose <?= htmlspecialchars(strtolower($collections[$activeSection][0]), ENT_QUOTES, 'UTF-8') ?>">
            <p style="margin:0">Drag and drop photos here, or click to choose files</p>
            <p style="margin:6px 0 0;font-size:.8rem">JPG, PNG, WEBP, GIF or AVIF - up to 8 MB each</p>
            <input type="file" data-file-input accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden>
          </div>
          <div class="admin-list" data-upload-list aria-live="polite"></div>
          <p class="status-msg" data-status role="status"></p>
          <h3>Current photos</h3>
          <div class="admin-list" data-image-list></div>
        </section>
      </div>
    <?php endif; ?>
  </div>
</main>
<?php if ($authenticated): ?>
<script src="js/admin.js"></script>
<?php endif; ?>
</body>
</html>
