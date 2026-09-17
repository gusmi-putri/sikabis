<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MotionEventResource;
use App\Models\MotionEvent;

class MotionEventController extends Controller
{
    public function index()
    {
        return MotionEventResource::collection(MotionEvent::latest()->get());
    }
}
