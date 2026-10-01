<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccessLogResource;
use App\Http\Resources\AccessPhotoResource;
use App\Models\AccessLog;
use App\Models\AccessPhoto;
use Illuminate\Http\JsonResponse;

class AccessLogController extends Controller
{
    public function index()
    {
        $logs = AccessLog::with('personnel')->latest()->latest('id')->get();

        return AccessLogResource::collection($logs);
    }

    /**
     * Foto kotak kunci yang tidak pernah mendapat pasangan log, misalnya
     * karena log dari Board A hilang. Foto yang masih dalam jendela
     * pemasangan belum dihitung, lognya mungkin masih dalam perjalanan.
     */
    public function unpairedPhotos()
    {
        $photos = $this->unpairedQuery()->latest()->latest('id')->get();

        return AccessPhotoResource::collection($photos);
    }

    /**
     * Buang satu foto tanpa log. Foto yang sudah menjadi bukti sebuah log
     * tidak bisa dihapus lewat sini.
     */
    public function destroyUnpairedPhoto(AccessPhoto $photo): JsonResponse
    {
        abort_if($photo->access_log_id !== null, 422, 'Foto ini sudah terpasang pada log akses.');

        $photo->delete();

        return response()->json(null, 204);
    }

    /**
     * Buang semua foto tanpa log yang sedang tampil di dashboard.
     */
    public function destroyUnpairedPhotos(): JsonResponse
    {
        $deleted = 0;

        // Dihapus satu per satu supaya event `deleted` ikut menghapus filenya.
        $this->unpairedQuery()->each(function (AccessPhoto $photo) use (&$deleted) {
            $photo->delete();
            $deleted++;
        });

        return response()->json(['deleted' => $deleted]);
    }

    private function unpairedQuery()
    {
        return AccessPhoto::whereNull('access_log_id')
            ->where('created_at', '<', now()->subSeconds(KeyBoxController::PAIRING_WINDOW_SECONDS));
    }
}
