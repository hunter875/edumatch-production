package com.example.jwt.example.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String verificationCode) {
        String subject = "Xác minh tài khoản EduMatch";
        String verificationLink = "http://localhost:8081/api/auth/verify?code=" + verificationCode;

        String body = """
        Xin chào,

        Cảm ơn bạn đã đăng ký tài khoản EduMatch.
        Vui lòng nhấn vào liên kết sau để xác minh tài khoản của bạn:

        %s

        Liên kết này sẽ hết hạn sau 10 phút.

        Trân trọng,
        Đội ngũ EduMatch
        """.formatted(verificationLink);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
