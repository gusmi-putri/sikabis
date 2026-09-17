<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccessLogResource;
use App\Models\AccessLog;

class AccessLogController extends Controller
{
    public function index()
    {
        $logs = AccessLog::with('personnel')->latest()->get();

        return AccessLogResource::collection($logs);
    }
}
