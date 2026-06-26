<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

$name    = $_POST['name'] ?? '';
$email   = $_POST['email'] ?? '';
$message = $_POST['message'] ?? '';

$mail = new PHPMailer(true);

try {

    // SMTP設定
    $mail->isSMTP();
    $mail->Host       = 'sv16483.xserver.jp';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'info@rhill-farm.com';
    $mail->Password   = 'RHF19820222';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // 文字コード
    $mail->CharSet = 'UTF-8';

    // 差出人
    $mail->setFrom(
        'info@rhill-farm.com',
        'RHILL FARM'
    );

    // 宛先
    $mail->addAddress('k.nakahara@rhill-farm.com');
    $mail->addAddress('info@rhill-farm.com');
    $mail->addAddress('keinosuke.nakahara18@gmail.com');
    $mail->addAddress('BeautyW@rhill-farm.com');
    $mail->addAddress('R.kawabe@rhill-farm.com');
    

    // 返信先
    if (!empty($email)) {
        $mail->addReplyTo($email, $name);
    }

    // 件名
    $mail->Subject = 'ホームページお問い合わせ';

    // 本文
    $mail->Body =
"お名前：{$name}

メール：{$email}

お問い合わせ内容：
{$message}";

    // 送信
    $mail->send();

    echo '
    <!DOCTYPE html>
    <html lang="ja">
    <head>
    <meta charset="UTF-8">
    <title>送信完了</title>
    <style>
    body{
        font-family:sans-serif;
        text-align:center;
        margin-top:80px;
    }
    a{
        display:inline-block;
        margin-top:30px;
        padding:12px 25px;
        background:#28a745;
        color:#fff;
        text-decoration:none;
        border-radius:5px;
    }
    </style>
    </head>
    <body>

    <h2>お問い合わせありがとうございました。</h2>

    <p>送信が完了しました。</p>

    <a href="index.html">トップページへ戻る</a>

    </body>
    </html>
    ';


} catch (Exception $e) {

    echo "送信失敗<br>";
    echo $mail->ErrorInfo;

}