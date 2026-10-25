package com.microfin.lms.domain;

import com.microfin.lms.domain.Enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A staff account. */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "company_id")
	private Company company;

	@Column(name = "full_name", nullable = false)
	private String fullName;

	/** Stored lower-case; unique across the platform because it is the login. */
	@Column(nullable = false)
	private String email;

	@Column(nullable = false)
	private String phone;

	@Column(name = "password_hash", nullable = false)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private UserStatus status;

	/** Carried in every token; bumping it on a password change signs every device out. */
	@Column(name = "token_version", nullable = false)
	private int tokenVersion;

	@Column(name = "last_login_at")
	private Instant lastLoginAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;
}
