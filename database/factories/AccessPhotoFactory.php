<?php

namespace Database\Factories;

use App\Models\AccessPhoto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AccessPhoto>
 */
class AccessPhotoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'device_id' => 'kotak-kunci-cam-01',
            'trigger_number' => fake()->numberBetween(1, 500),
            'device_uptime_ms' => fake()->numberBetween(1000, 10_000_000),
            'image_path' => '/storage/access-photos/'.fake()->uuid().'.jpg',
            'access_log_id' => null,
        ];
    }
}
