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

/** A lender signed up on the platform. Every other row belongs to exactly one company. */
@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
public class Company {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	/** The office every line leaves from; collection routes start here. */
	@Column(name = "office_lat", precision = 9, scale = 6)
	private BigDecimal officeLat;

	@Column(name = "office_lng", precision = 9, scale = 6)
	private BigDecimal officeLng;

	@Column(name = "daily_target", nullable = false)
	private long dailyTarget;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;
}
