<?php

mb_language("Japanese");
mb_internal_encoding("UTF-8");

$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$message = $_POST['message'] ?? '';

$to = "k.nakahara@rhill-farm.com, BeautyW@rhill-farm.com, R.kawabe@rhill-farm.com, info@rhill-farm.com";
$subject = "ホームページお問い合わせ";

// 本文（UTF-8で作成）
$body = "お名前：{$name}\n\n"
      . "メール：{$email}\n\n"
      . "お問い合わせ内容：\n{$message}";

// ★ここが重要：ISO-2022-JPに変換
$body = mb_convert_encoding($body, "ISO-2022-JP", "UTF-8");
$subject = mb_encode_mimeheader($subject, "ISO-2022-JP", "B");

// ヘッダ
$headers  = "From: info@rhill-farm.com\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "Content-Type: text/plain; charset=ISO-2022-JP\r\n";

$result = mb_send_mail(
    $to,
    $subject,
    $body,
    $headers
);

echo $result ? "送信完了" : "送信失敗";
?>