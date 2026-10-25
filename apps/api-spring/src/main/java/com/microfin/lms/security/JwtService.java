package com.microfin.lms.security;

import com.microfin.lms.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	private static final Logger log = LoggerFactory.getLogger(JwtService.class);

	private final SecretKey key;
	private final Clock clock;

	public JwtService(AppProperties properties, Clock clock) {
		this.clock = clock;
		String secret = properties.auth().jwtSecret();
		if (secret == null || secret.isBlank()) {
			log.warn("JWT_SECRET is not set: using a random signing key, so everyone is signed out on restart");
			this.key = Jwts.SIG.HS256.key().build();
		} else {
			this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
		}
	}

	public record Issued(String token, Instant expiresAt) {
	}

	/** The user id and token version carried by a genuine, unexpired token. */
	public record Verified(Long userId, int tokenVersion) {
	}

	public Issued issue(Long userId, int tokenVersion, Duration ttl) {
		Instant now = clock.instant();
		Instant expiresAt = now.plus(ttl);
		String token = Jwts.builder()
				.subject(String.valueOf(userId))
				.claim("ver", tokenVersion)
				.issuedAt(Date.from(now))
				.expiration(Date.from(expiresAt))
				.signWith(key)
				.compact();
		return new Issued(token, expiresAt);
	}

	public Optional<Verified> verify(String token) {
		try {
			Claims claims = Jwts.parser()
					.verifyWith(key)
					.clock(() -> Date.from(clock.instant()))
					.build()
					.parseSignedClaims(token)
					.getPayload();
			return Optional.of(new Verified(Long.valueOf(claims.getSubject()), claims.get("ver", Integer.class)));
		} catch (JwtException | IllegalArgumentException | NullPointerException e) {
			return Optional.empty();
		}
	}
}
