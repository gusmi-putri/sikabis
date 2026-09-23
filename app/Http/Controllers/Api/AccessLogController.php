<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccessLogResource;
use App\Http\Resources\AccessPhotoResource;
use App\Models\AccessLog;
use App\Models\AccessPhoto;

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
        $photos = AccessPhoto::whereNull('access_log_id')
            ->where('created_at', '<', now()->subSeconds(KeyBoxController::PAIRING_WINDOW_SECONDS))
            ->latest()
            ->latest('id')
            ->get();

        return AccessPhotoResource::collection($photos);
    }
}
