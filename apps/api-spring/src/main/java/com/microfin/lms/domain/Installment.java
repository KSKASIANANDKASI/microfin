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

/** One installment of a loan's schedule. */
@Entity
@Table(name = "loan_installments")
@Getter
@Setter
@NoArgsConstructor
public class Installment {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "loan_id")
	private Loan loan;

	/** 1-based installment number. */
	@Column(nullable = false)
	private int seq;

	@Column(name = "due_on", nullable = false)
	private LocalDate dueOn;

	@Column(nullable = false)
	private long amount;

	/** What is still owed once this installment is in. */
	@Column(name = "balance_after", nullable = false)
	private long balanceAfter;

	/** When the money came in; null while unpaid. */
	@Column(name = "paid_on")
	private LocalDate paidOn;

	public boolean isPaid() {
		return paidOn != null;
	}
}
