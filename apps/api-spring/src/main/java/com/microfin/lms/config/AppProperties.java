package com.microfin.lms.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.nio.file.Path;
import java.time.Duration;
import java.time.ZoneId;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "lms")
public record AppProperties(
		/** "Today" for due dates, the collection sheet and receipts is the calendar day in this zone. */
		@NotNull ZoneId zone,
		@Valid @NotNull Auth auth,
		@Valid @NotNull Cors cors,
		@Valid @NotNull Storage storage,
		@Valid @NotNull Kyc kyc,
		@Valid @NotNull Ai ai,
		@Valid @NotNull Mail mail) {

	public record Auth(
			/** Base64 key of 32+ bytes. Blank means a random key per start, which signs everyone out on restart. */
			String jwtSecret,
			@NotNull Duration accessTtl,
			/** Token lifetime when "keep me signed in" is ticked, and for the mobile app. */
			@NotNull Duration rememberTtl,
			@NotNull Duration resetTtl,
			/** Dev only: return the password reset token in the API response instead of only mailing it. */
			boolean devEchoResetToken) {
	}

	public record Cors(@NotEmpty List<String> origins) {
	}

	public record Storage(@NotNull Path dir) {
	}

	public record Kyc(
			/** Base64 AES key (16, 24 or 32 bytes) that encrypts ID numbers at rest. */
			@NotBlank String encryptionKey) {
	}

	public record Ai(String apiKey, @NotBlank String model) {
	}

	public record Mail(
			/** Sender of outgoing mail, e.g. {@code Finance Easy <no-reply@example.com>}. */
			@NotBlank String from,
			/** The web app's reset page; the emailed link appends {@code ?token=…}. */
			@NotBlank String resetUrl) {
	}
}
