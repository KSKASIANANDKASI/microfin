package com.microfin.lms.common;

import com.microfin.lms.config.AppProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Outgoing mail over SMTP (`spring.mail.*`, set from the MAIL_* variables). Spring only creates a
 * mail sender when MAIL_HOST is set; without one this logs that a message was due and sends
 * nothing. The reset token itself is deliberately never logged.
 */
@Component
public class Mailer {

	private static final Logger log = LoggerFactory.getLogger(Mailer.class);

	private final ObjectProvider<JavaMailSender> sender;
	private final AppProperties properties;

	public Mailer(ObjectProvider<JavaMailSender> sender, AppProperties properties) {
		this.sender = sender;
		this.properties = properties;
	}

	/**
	 * Sent off the request thread, so a slow or unreachable SMTP server neither delays the reply
	 * nor hints, by timing, whether the address has an account. Failures are logged, not thrown.
	 */
	@Async
	public void sendPasswordReset(String email, String token) {
		JavaMailSender smtp = sender.getIfAvailable();
		if (smtp == null) {
			log.info("Password reset requested for {} — no mail server configured (MAIL_HOST), nothing was sent", email);
			return;
		}

		String link = UriComponentsBuilder.fromUriString(properties.mail().resetUrl())
				.queryParam("token", token)
				.build()
				.toUriString();
		long minutes = properties.auth().resetTtl().toMinutes();

		try {
			MimeMessage message = smtp.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(properties.mail().from());
			helper.setTo(email);
			helper.setSubject("Reset your Finance Easy password");
			helper.setText(resetText(link, minutes), resetHtml(link, minutes));
			smtp.send(message);
			log.info("Password reset mail sent to {}", email);
		} catch (MessagingException | MailException e) {
			log.error("Could not send the password reset mail to {}", email, e);
		}
	}

	private static String resetText(String link, long minutes) {
		return """
				Someone asked to reset the password for your Finance Easy account.

				Open this link to choose a new password:
				%s

				The link works once and expires in %d minutes. If you didn't ask for this, ignore this \
				email; your password stays the same.

				— Finance Easy, Billionbrains Tech Ltd
				""".formatted(link, minutes);
	}

	private static String resetHtml(String link, long minutes) {
		String href = HtmlUtils.htmlEscape(link);
		return """
				<!doctype html>
				<html><body style="margin:0;padding:24px;background:#f7f8fb;font-family:Arial,Helvetica,sans-serif;color:#0d1b33">
				<table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center">
				<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
				<tr><td>
				<p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#062045">Finance <span style="color:#c28e14">Easy</span></p>
				<h1 style="margin:0 0 12px;font-size:20px">Reset your password</h1>
				<p style="margin:0 0 24px;font-size:15px;line-height:22px">Someone asked to reset the password for your Finance Easy account. Choose a new one with the button below.</p>
				<p style="margin:0 0 24px"><a href="%s" style="display:inline-block;background:#062045;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px">Set a new password</a></p>
				<p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#5a6b85">The link works once and expires in %d minutes. If you didn't ask for this, ignore this email; your password stays the same.</p>
				<p style="margin:0;font-size:13px;line-height:20px;color:#5a6b85;word-break:break-all">Button not working? Paste this into your browser: %s</p>
				</td></tr></table>
				<p style="margin:16px 0 0;font-size:12px;color:#78869c">Finance Easy · Billionbrains Tech Ltd</p>
				</td></tr></table>
				</body></html>
				""".formatted(href, minutes, href);
	}
}
