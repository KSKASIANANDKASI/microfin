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

/** A loan on its way to disbursal: submitted by an officer, decided by a manager. */
@Entity
@Table(name = "loan_applications")
@Getter
@Setter
@NoArgsConstructor
public class LoanApplication {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "company_id")
	private Company company;

	@Column(nullable = false)
	private String code;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "customer_id")
	private Customer customer;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "line_id")
	private Line line;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private LoanType type;

	@Column(nullable = false)
	private long principal;

	@Column(name = "annual_rate_pct", nullable = false, precision = 6, scale = 3)
	private BigDecimal annualRatePct;

	@Column(nullable = false)
	private int months;

	@Column(nullable = false)
	private long fee;

	/** The installment agreed at booking, which may be rounded up from the calculated one. */
	@Column(nullable = false)
	private long emi;

	/** The disbursal date the officer asked for. */
	@Column(name = "disburse_on", nullable = false)
	private LocalDate disburseOn;

	@Column(name = "submitted_on", nullable = false)
	private LocalDate submittedOn;

	@Column(name = "submitted_by_id")
	private Long submittedById;

	@Column(name = "submitted_by", nullable = false)
	private String submittedBy;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ApplicationStatus status;

	/** The approver's note, or the reason for a rejection. */
	private String note;

	@Column(name = "decided_on")
	private LocalDate decidedOn;

	@Column(name = "decided_by_id")
	private Long decidedById;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "loan_id")
	private Loan loan;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;
}
