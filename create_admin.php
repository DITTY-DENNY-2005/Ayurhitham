<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/config.php';

try {
    $pdo = db();
    $schema = file_get_contents(__DIR__ . '/setup.sql');
    if ($schema === false) {
        throw new RuntimeException('Could not read setup.sql.');
    }
    foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
        $pdo->exec($statement);
    }

    $columnCheck = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS '
        . 'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name'
    );
    $columnCheck->execute(['table_name' => 'gallery_images', 'column_name' => 'image_type']);
    if ((int) $columnCheck->fetchColumn() === 0) {
        $pdo->exec(
            "ALTER TABLE gallery_images ADD COLUMN image_type "
            . "ENUM('gallery', 'reviews', 'homestay') NOT NULL DEFAULT 'gallery' AFTER filename"
        );
    }

    $adminExists = (int) $pdo->query('SELECT COUNT(*) FROM admin_users')->fetchColumn() > 0;
    if (!$adminExists) {
        fwrite(STDOUT, 'Admin username: ');
        $username = trim((string) fgets(STDIN));
        fwrite(STDOUT, 'Admin password (minimum 12 characters): ');
        $password = rtrim((string) fgets(STDIN), "\r\n");

        if (!preg_match('/\A[a-zA-Z0-9._-]{3,80}\z/', $username)) {
            throw new InvalidArgumentException('Use 3-80 letters, numbers, dots, underscores or hyphens for the username.');
        }
        if (strlen($password) < 12) {
            throw new InvalidArgumentException('The password must contain at least 12 characters.');
        }

        $insert = $pdo->prepare(
            'INSERT INTO admin_users (username, password_hash) VALUES (:username, :password_hash)'
        );
        $insert->execute([
            'username' => $username,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ]);
    } else {
        fwrite(STDOUT, "An admin account already exists; it was not changed.\n");
    }

    $seed = $pdo->prepare(
        'INSERT IGNORE INTO gallery_images (filename, original_name, mime_type, file_size) '
        . 'VALUES (:filename, :original_name, :mime_type, :file_size)'
    );
    foreach (glob(__DIR__ . '/gallery-images/*') ?: [] as $path) {
        if (!is_file($path)) {
            continue;
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/avif' => 'avif',
        ];
        if (!is_string($mime) || !isset($extensions[$mime])) {
            continue;
        }
        $filename = basename($path);
        if (!preg_match('/\A[a-zA-Z0-9._-]{1,80}\z/', $filename)) {
            continue;
        }
        $seed->execute([
            'filename' => $filename,
            'original_name' => $filename,
            'mime_type' => $mime,
            'file_size' => filesize($path),
        ]);
    }

    fwrite(STDOUT, "Setup complete. Existing gallery photos have been imported.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'Setup failed: ' . $error->getMessage() . "\n");
    exit(1);
}
