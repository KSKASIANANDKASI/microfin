package com.microfin.lms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.microfin.lms.common.Mailer;
import com.microfin.lms.config.AppProperties;
import jakarta.mail.BodyPart;
import jakarta.mail.Message;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

class MailerTest {

	private static final AppProperties PROPERTIES = new AppProperties(ZoneId.of("Asia/Kolkata"),
			new AppProperties.Auth(null, Duration.ofHours(1), Duration.ofDays(30), Duration.ofMinutes(30), false),
			null, null, null, null,
			new AppProperties.Mail("Finance Easy <no-reply@test.local>", "https://app.example.com/reset-password"));

	@Test
	void sendsResetLinkWhenSmtpIsConfigured() throws Exception {
		JavaMailSender smtp = mock(JavaMailSender.class);
		when(smtp.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));

		new Mailer(provider(smtp), PROPERTIES).sendPasswordReset("anitha@demo.lms", "tok_123-abc");

		ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
		verify(smtp).send(sent.capture());
		MimeMessage message = sent.getValue();
		assertThat(message.getRecipients(Message.RecipientType.TO)[0].toString()).isEqualTo("anitha@demo.lms");
		assertThat(message.getFrom()[0].toString()).isEqualTo("Finance Easy <no-reply@test.local>");
		assertThat(message.getSubject()).isEqualTo("Reset your Finance Easy password");
		String text = textOf(message);
		assertThat(text).contains("https://app.example.com/reset-password?token=tok_123-abc");
		assertThat(text).contains("30 minutes");
	}

	@Test
	void sendsNothingWithoutSmtp() {
		JavaMailSender smtp = mock(JavaMailSender.class);
		new Mailer(provider(null), PROPERTIES).sendPasswordReset("anitha@demo.lms", "tok_123-abc");
		verify(smtp, never()).send(any(MimeMessage.class));
	}

	@SuppressWarnings("unchecked")
	private static ObjectProvider<JavaMailSender> provider(JavaMailSender smtp) {
		ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
		when(provider.getIfAvailable()).thenReturn(smtp);
		return provider;
	}

	/** Every text/plain and text/html part, decoded, run together. */
	private static String textOf(Part part) throws Exception {
		Object content = part.getContent();
		if (content instanceof String text) return text;
		StringBuilder out = new StringBuilder();
		if (content instanceof Multipart multipart) {
			for (int i = 0; i < multipart.getCount(); i++) {
				BodyPart child = multipart.getBodyPart(i);
				out.append(textOf(child)).append('\n');
			}
		}
		return out.toString();
	}
}
