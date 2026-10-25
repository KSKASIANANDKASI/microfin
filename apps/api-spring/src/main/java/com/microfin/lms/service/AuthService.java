package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.AuditService;
import com.microfin.lms.common.Mailer;
import com.microfin.lms.config.AppProperties;
import com.microfin.lms.domain.Company;
import com.microfin.lms.domain.Enums.Role;
import com.microfin.lms.domain.Enums.UserStatus;
import com.microfin.lms.domain.PasswordResetToken;
import com.microfin.lms.domain.User;
import com.microfin.lms.repo.CompanyRepository;
import com.microfin.lms.repo.PasswordResetTokenRepository;
import com.microfin.lms.repo.UserRepository;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.security.JwtService;
import com.microfin.lms.security.LoginThrottle;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

	public record Session(String token, Instant expiresAt, UserView user) {
	}

	public record UserView(Long id, String fullName, String email, String phone, Role role, UserStatus status,
			String company) {

		public static UserView of(User user) {
			return new UserView(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getRole(),
					user.getStatus(), user.getCompany().getName());
		}
	}

	private final UserRepository users;
	private final CompanyRepository companies;
	private final PasswordResetTokenRepository resetTokens;
	private final PasswordEncoder passwords;
	private final JwtService jwt;
	private final LoginThrottle throttle;
	private final Mailer mailer;
	private final AuditService audit;
	private final AppProperties properties;
	private final Clock clock;
	private final SecureRandom random = new SecureRandom();

	public AuthService(UserRepository users, CompanyRepository companies, PasswordResetTokenRepository resetTokens,
			PasswordEncoder passwords, JwtService jwt, LoginThrottle throttle, Mailer mailer, AuditService audit,
			AppProperties properties, Clock clock) {
		this.users = users;
		this.companies = companies;
		this.resetTokens = resetTokens;
		this.passwords = passwords;
		this.jwt = jwt;
		this.throttle = throttle;
		this.mailer = mailer;
		this.audit = audit;
		this.properties = properties;
		this.clock = clock;
	}

	public static String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	/** Registers a new lender and its first user, who becomes the admin. */
	@Transactional
	public Session signUp(String companyName, String fullName, String email, String phone, String password) {
		String login = normalizeEmail(email);
		if (users.existsByEmail(login)) {
			throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists");
		}
		Instant now = clock.instant();
		Company company = new Company();
		company.setName(companyName.trim());
		company.setCreatedAt(now);
		companies.save(company);

		User user = newUser(company, fullName, login, phone, password, Role.ADMIN, now);
		audit.record(company.getId(), user.getId(), "SIGN_UP", "COMPANY", String.valueOf(company.getId()), company.getName());
		return session(user, false);
	}

	User newUser(Company company, String fullName, String email, String phone, String password, Role role, Instant now) {
		User user = new User();
		user.setCompany(company);
		user.setFullName(fullName.trim());
		user.setEmail(email);
		user.setPhone(phone);
		user.setPasswordHash(passwords.encode(password));
		user.setRole(role);
		user.setStatus(UserStatus.ACTIVE);
		user.setCreatedAt(now);
		return users.save(user);
	}

	@Transactional
	public Session signIn(String email, String password, boolean remember) {
		String login = normalizeEmail(email);
		if (throttle.isBlocked(login)) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
					"Too many failed sign-ins. Try again in 15 minutes.");
		}
		User user = users.findByEmail(login).orElse(null);
		// One message for every failure, so the response does not reveal which emails have accounts.
		if (user == null || !passwords.matches(password, user.getPasswordHash())) {
			throttle.recordFailure(login);
			throw new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Wrong email or password");
		}
		if (user.getStatus() != UserStatus.ACTIVE) {
			throw ApiException.forbidden("This account has been suspended. Contact your administrator.");
		}
		throttle.reset(login);
		user.setLastLoginAt(clock.instant());
		audit.record(user.getCompany().getId(), user.getId(), "SIGN_IN", "USER", String.valueOf(user.getId()), null);
		return session(user, remember);
	}

	@Transactional(readOnly = true)
	public UserView me(CurrentUser current) {
		return UserView.of(users.findById(current.id()).orElseThrow(() -> ApiException.notFound("User")));
	}

	/**
	 * Starts a password reset. Says nothing about whether the email is registered. Returns the
	 * token only when dev echo is on; otherwise it travels by mail alone.
	 */
	@Transactional
	public Optional<String> forgotPassword(String email) {
		User user = users.findByEmail(normalizeEmail(email)).orElse(null);
		if (user == null || user.getStatus() != UserStatus.ACTIVE) {
			return Optional.empty();
		}
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

		Instant now = clock.instant();
		PasswordResetToken reset = new PasswordResetToken();
		reset.setUser(user);
		reset.setTokenHash(sha256(token));
		reset.setExpiresAt(now.plus(properties.auth().resetTtl()));
		reset.setCreatedAt(now);
		resetTokens.save(reset);

		mailer.sendPasswordReset(user.getEmail(), token);
		audit.record(user.getCompany().getId(), user.getId(), "PASSWORD_RESET_REQUESTED", "USER", String.valueOf(user.getId()), null);
		return properties.auth().devEchoResetToken() ? Optional.of(token) : Optional.empty();
	}

	@Transactional
	public void resetPassword(String token, String newPassword) {
		Instant now = clock.instant();
		PasswordResetToken reset = resetTokens.findByTokenHash(sha256(token))
				.filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(now))
				.orElseThrow(() -> ApiException.badRequest("RESET_LINK_INVALID", "This reset link is invalid or has expired"));
		reset.setUsedAt(now);
		User user = reset.getUser();
		setPassword(user, newPassword);
		throttle.reset(user.getEmail());
		audit.record(user.getCompany().getId(), user.getId(), "PASSWORD_RESET", "USER", String.valueOf(user.getId()), null);
	}

	/** Changes the caller's own password and returns a fresh session, since the old token stops working. */
	@Transactional
	public Session changePassword(CurrentUser current, String currentPassword, String newPassword) {
		User user = users.findById(current.id()).orElseThrow(() -> ApiException.notFound("User"));
		if (!passwords.matches(currentPassword, user.getPasswordHash())) {
			throw ApiException.badRequest("WRONG_PASSWORD", "Your current password is not correct");
		}
		setPassword(user, newPassword);
		audit.record(current, "PASSWORD_CHANGED", "USER", String.valueOf(user.getId()), null);
		return session(user, false);
	}

	private void setPassword(User user, String password) {
		user.setPasswordHash(passwords.encode(password));
		user.setTokenVersion(user.getTokenVersion() + 1);
	}

	private Session session(User user, boolean remember) {
		JwtService.Issued issued = jwt.issue(user.getId(), user.getTokenVersion(),
				remember ? properties.auth().rememberTtl() : properties.auth().accessTtl());
		return new Session(issued.token(), issued.expiresAt(), UserView.of(user));
	}

	private static String sha256(String value) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}
}
