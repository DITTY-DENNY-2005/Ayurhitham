<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config.php';

start_app_session();

function require_admin(): void
{
    if (!isset($_SESSION['admin_id'])) {
        json_response(['error' => 'Sign in to manage gallery photos.'], 401);
    }
}

function require_csrf(): void
{
    if (!csrf_is_valid()) {
        json_response(['error' => 'Your session expired. Refresh the page and try again.'], 419);
    }
}

function valid_collection(string $collection): bool
{
    return in_array($collection, ['gallery', 'reviews', 'homestay'], true);
}

function gallery_filename(string $filename): bool
{
    return (bool) preg_match('/\A[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}\z/', $filename);
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $collection = $_GET['type'] ?? 'gallery';
        if (!is_string($collection) || !valid_collection($collection)) {
            json_response(['error' => 'Invalid image collection.'], 400);
        }
        $list = db()->prepare(
            'SELECT filename, original_name, uploaded_at FROM gallery_images '
            . 'WHERE image_type = :image_type ORDER BY id DESC'
        );
        $list->execute(['image_type' => $collection]);
        $images = $list->fetchAll();
        foreach ($images as &$image) {
            $image['url'] = 'gallery-images/' . rawurlencode($image['filename']);
        }
        unset($image);
        json_response(['images' => $images]);
    }

    require_admin();
    require_csrf();

    if ($method === 'POST') {
        $collection = $_POST['type'] ?? '';
        if (!is_string($collection) || !valid_collection($collection)) {
            json_response(['error' => 'Choose a valid image collection.'], 400);
        }
        $upload = $_FILES['image'] ?? null;
        if (!is_array($upload) || !isset($upload['error'], $upload['tmp_name'], $upload['size'])) {
            json_response(['error' => 'Choose an image to upload.'], 400);
        }
        if ($upload['error'] !== UPLOAD_ERR_OK) {
            json_response(['error' => 'The image upload failed. Please try again.'], 400);
        }
        if ($upload['size'] < 1 || $upload['size'] > 8 * 1024 * 1024) {
            json_response(['error' => 'Images must be smaller than 8 MB.'], 413);
        }

        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/avif' => 'avif',
        ];
        if (!is_string($mime) || !isset($extensions[$mime])) {
            json_response(['error' => 'Use a JPG, PNG, WEBP, GIF or AVIF image.'], 415);
        }

        $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
        $directory = dirname(__DIR__) . '/gallery-images';
        if (!is_dir($directory) || !is_writable($directory)) {
            throw new RuntimeException('The gallery-images directory must exist and be writable by PHP.');
        }
        $destination = $directory . '/' . $filename;
        if (!move_uploaded_file($upload['tmp_name'], $destination)) {
            throw new RuntimeException('Could not store the uploaded image.');
        }

        try {
            $insert = db()->prepare(
                'INSERT INTO gallery_images (filename, image_type, original_name, mime_type, file_size) '
                . 'VALUES (:filename, :image_type, :original_name, :mime_type, :file_size)'
            );
            $insert->execute([
                'filename' => $filename,
                'image_type' => $collection,
                'original_name' => substr(basename(str_replace('\\', '/', (string) $upload['name'])), 0, 255),
                'mime_type' => $mime,
                'file_size' => $upload['size'],
            ]);
        } catch (Throwable $error) {
            @unlink($destination);
            throw $error;
        }

        json_response(['image' => [
            'filename' => $filename,
            'type' => $collection,
            'original_name' => substr(basename(str_replace('\\', '/', (string) $upload['name'])), 0, 255),
            'url' => 'gallery-images/' . rawurlencode($filename),
        ]], 201);
    }

    if ($method === 'DELETE') {
        $body = json_decode((string) file_get_contents('php://input'), true);
        $filename = is_array($body) ? ($body['filename'] ?? null) : null;
        $collection = is_array($body) ? ($body['type'] ?? null) : null;
        if (
            !is_string($filename)
            || !gallery_filename($filename)
            || !is_string($collection)
            || !valid_collection($collection)
        ) {
            json_response(['error' => 'Invalid image or collection.'], 400);
        }

        $select = db()->prepare(
            'SELECT id FROM gallery_images WHERE filename = :filename AND image_type = :image_type'
        );
        $select->execute(['filename' => $filename, 'image_type' => $collection]);
        $image = $select->fetch();
        if (!$image) {
            json_response(['error' => 'That photo is no longer in the gallery.'], 404);
        }

        $delete = db()->prepare('DELETE FROM gallery_images WHERE id = :id');
        $delete->execute(['id' => $image['id']]);
        $path = dirname(__DIR__) . '/gallery-images/' . $filename;
        if (is_file($path) && !unlink($path)) {
            error_log('Could not remove gallery image file: ' . $filename);
            json_response(['error' => 'The image record was removed, but its file could not be deleted.'], 500);
        }
        json_response(['ok' => true]);
    }

    header('Allow: GET, POST, DELETE');
    json_response(['error' => 'Method not allowed.'], 405);
} catch (Throwable $error) {
    error_log('Gallery API error: ' . $error->getMessage());
    json_response(['error' => 'The gallery could not complete that request. Check the server configuration.'], 500);
}
