<?php
/**
 * Nexus Media - Contact Form Handler
 * Receives form submissions, validates, and sends email.
 */

// ── CONFIG ──
$to_email    = 'info@nexusmedia.co.za';
$from_email  = 'noreply@nexusmedia.co.za';  // Must be a domain email for Xneelo
$subject     = 'New Enquiry via nexusmedia.co.za';

// ── CORS & METHOD CHECK ──
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

// ── RATE LIMITING (file-based, simple) ──
$rate_file = sys_get_temp_dir() . '/nexus_form_' . md5($_SERVER['REMOTE_ADDR']) . '.txt';
if (file_exists($rate_file)) {
    $last = (int) file_get_contents($rate_file);
    if (time() - $last < 30) {
        http_response_code(429);
        echo json_encode(['success' => false, 'message' => 'Please wait before submitting again.']);
        exit;
    }
}

// ── GET INPUT ──
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    // Fallback to form-encoded
    $input = $_POST;
}

$fname     = trim($input['fname'] ?? '');
$lname     = trim($input['lname'] ?? '');
$email     = trim($input['email'] ?? '');
$phone     = trim($input['phone'] ?? '');
$service   = trim($input['service'] ?? '');
$message   = trim($input['message'] ?? '');
$honeypot  = trim($input['website'] ?? '');
$timestamp = (int) ($input['form_timestamp'] ?? 0);

// ── HONEYPOT CHECK ──
if (!empty($honeypot)) {
    // Bot detected - return fake success
    echo json_encode(['success' => true, 'message' => 'Message sent successfully.']);
    exit;
}

// ── TIMESTAMP CHECK (must be at least 3 seconds) ──
if ($timestamp > 0) {
    $elapsed = (time() * 1000) - $timestamp;
    if ($elapsed < 3000) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Submission too fast.']);
        exit;
    }
}

// ── VALIDATION ──
$errors = [];

if (empty($fname) || empty($lname)) {
    $errors[] = 'Full name is required.';
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'A valid email address is required.';
}

if (empty($service)) {
    $errors[] = 'Please select a service.';
}

if (empty($message) || strlen($message) < 10) {
    $errors[] = 'Please provide more detail about your project.';
}

// URL spam check
if (substr_count(strtolower($message), 'http') > 2) {
    $errors[] = 'Too many links in message.';
}

// Block common spam phrases
$spam_phrases = ['crypto', 'bitcoin', 'casino', 'viagra', 'lottery', 'winner', 'click here now'];
foreach ($spam_phrases as $phrase) {
    if (stripos($message, $phrase) !== false) {
        // Silent fake success for spammers
        echo json_encode(['success' => true, 'message' => 'Message sent successfully.']);
        exit;
    }
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// ── SANITISE ──
$fname   = htmlspecialchars($fname, ENT_QUOTES, 'UTF-8');
$lname   = htmlspecialchars($lname, ENT_QUOTES, 'UTF-8');
$email   = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$phone   = htmlspecialchars($phone, ENT_QUOTES, 'UTF-8');
$service = htmlspecialchars($service, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// ── SERVICE LABEL MAP ──
$service_labels = [
    'brand'      => 'Brand Identity',
    'digital'    => 'Digital Marketing',
    'content'    => 'Content & Studios',
    'web'        => 'Web & Product',
    'events'     => 'Events & Activations',
    'influencer' => 'Content Creator & Community',
    'other'      => 'Something else',
];
$service_label = $service_labels[$service] ?? $service;

// ── BUILD EMAIL ──
$email_body = "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEW ENQUIRY - nexusmedia.co.za
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:     {$fname} {$lname}
Email:    {$email}
Phone:    {$phone}
Service:  {$service_label}

━━━ MESSAGE ━━━

{$message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted: " . date('Y-m-d H:i:s') . " SAST
IP: {$_SERVER['REMOTE_ADDR']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
";

$headers  = "From: Nexus Media Website <{$from_email}>\r\n";
$headers .= "Reply-To: {$fname} {$lname} <{$email}>\r\n";
$headers .= "X-Mailer: NexusMedia-Contact-Form\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// ── SEND ──
$sent = mail($to_email, $subject . ' - ' . $service_label, $email_body, $headers);

if ($sent) {
    // Record timestamp for rate limiting
    file_put_contents($rate_file, time());

    // ── AUTO-REPLY TO SENDER ──
    $reply_subject = 'Thanks for getting in touch - Nexus Media';
    $reply_body = "Hi {$fname},

Thanks for reaching out to Nexus Media. We have received your enquiry regarding {$service_label} and will be in touch within 1-2 business days.

In the meantime, feel free to explore our work at nexusmedia.co.za

Regards,
The Nexus Media Team
(011) 789-8215
info@nexusmedia.co.za
";

    $reply_headers  = "From: Nexus Media <{$from_email}>\r\n";
    $reply_headers .= "Reply-To: {$to_email}\r\n";
    $reply_headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    mail($email, $reply_subject, $reply_body, $reply_headers);

    echo json_encode(['success' => true, 'message' => 'Thanks! Your message has been sent. We will be in touch shortly.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Something went wrong. Please email us directly at info@nexusmedia.co.za']);
}
