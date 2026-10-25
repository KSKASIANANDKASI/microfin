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

/** A booked loan. Its schedule is written once at disbursal; balances are derived from it. */
@Entity
@Table(name = "loans")
@Getter
@Setter
@NoArgsConstructor
public class Loan {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "company_id")
	private Company company;

	@Column(name = "loan_no", nullable = false)
	private String loanNo;

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

	@Column(name = "total_interest", nullable = false)
	private long totalInterest;

	@Column(name = "total_payable", nullable = false)
	private long totalPayable;

	@Column(name = "net_disbursal", nullable = false)
	private long netDisbursal;

	@Column(name = "disbursed_on", nullable = false)
	private LocalDate disbursedOn;

	@Column(name = "disbursed_by")
	private Long disbursedBy;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private LoanStatus status;

	@Column(name = "closed_on")
	private LocalDate closedOn;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;
}
