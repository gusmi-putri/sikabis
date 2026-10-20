<?php

namespace App\Support;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Foto bukti tidak lagi dilayani langsung dari /storage (siapa pun yang tahu
 * URL-nya bisa membuka). Dashboard menerima URL bertanda tangan yang hanya
 * bisa didapat setelah login, dan berlaku sementara.
 */
class MediaUrl
{
    /** Folder di disk public yang boleh dilayani lewat rute media. */
    public const FOLDERS = ['access-photos', 'motion-events'];

    /** Lama berlaku minimal; kedaluwarsa dibulatkan supaya URL stabil. */
    private const BUCKET_SECONDS = 6 * 3600;

    /**
     * Ubah nilai image_path di database (URL penuh lama atau "/storage/...")
     * menjadi URL bertanda tangan relatif. URL luar (data contoh) dibiarkan.
     */
    public static function signed(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        if (! str_contains($stored, '/storage/')) {
            return $stored;
        }

        [$folder, $name] = array_pad(explode('/', Str::after($stored, '/storage/'), 2), 2, '');

        if (! in_array($folder, self::FOLDERS, true) || $name === '') {
            return null;
        }

        // Kedaluwarsa jatuh di batas kelipatan 6 jam (berlaku 6-12 jam) agar
        // URL yang sama dikirim berulang dan cache browser tetap bekerja.
        $expires = (intdiv(time(), self::BUCKET_SECONDS) + 2) * self::BUCKET_SECONDS;

        return URL::temporarySignedRoute(
            'media.show',
            $expires,
            ['folder' => $folder, 'name' => $name],
            absolute: false,
        );
    }
}
