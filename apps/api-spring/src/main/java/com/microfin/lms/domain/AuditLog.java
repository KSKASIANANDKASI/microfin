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

/** Who did what. Written for every sign-in, decision, disbursal and receipt. */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "company_id", nullable = false)
	private Long companyId;

	@Column(name = "actor_id")
	private Long actorId;

	@Column(nullable = false)
	private String action;

	@Column(nullable = false)
	private String entity;

	@Column(name = "entity_code")
	private String entityCode;

	private String detail;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;
}
