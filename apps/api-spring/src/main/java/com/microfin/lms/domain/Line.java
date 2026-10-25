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

/** A collection line: the route an officer walks. */
@Entity
@Table(name = "lines")
@Getter
@Setter
@NoArgsConstructor
public class Line {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "company_id")
	private Company company;

	@Column(nullable = false)
	private String code;

	@Column(nullable = false)
	private String name;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "officer_id")
	private User officer;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Frequency frequency;

	/** Weekday for weekly lines, day of month (or "Last day") for monthly ones, otherwise null. */
	private String schedule;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	public String officerName() {
		return officer == null ? "Unassigned" : officer.getFullName();
	}
}
