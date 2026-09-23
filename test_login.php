<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$u = \App\Models\User::where('username', 'piket')->first();
if (!$u) {
    echo "User not found\n";
    exit;
}

echo "Password Hash in DB: " . $u->password . "\n";
echo "Hash check for '123': " . (\Illuminate\Support\Facades\Hash::check('123', $u->password) ? 'TRUE' : 'FALSE') . "\n";
