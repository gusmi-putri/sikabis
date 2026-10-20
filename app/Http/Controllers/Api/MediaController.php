<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\MediaUrl;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function show(string $folder, string $name)
    {
        $disk = Storage::disk('public');
        $path = $folder.'/'.$name;

        abort_unless(
            in_array($folder, MediaUrl::FOLDERS, true)
                && preg_match('/^[A-Za-z0-9._-]+$/', $name)
                && $disk->exists($path),
            404,
        );

        return $disk->response($path, null, [
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
