<?php
$url = 'http://localhost:8000/api/login';
$data = array('username' => 'piket', 'password' => '123');

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n" . "Accept: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data),
        'ignore_errors' => true // to get the response body even if 4xx/5xx
    )
);

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$http_response_header = $http_response_header ?? [];

echo "Status: " . ($http_response_header[0] ?? 'Unknown') . "\n";
echo "Response: " . $result . "\n";
