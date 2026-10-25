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

/** A receipt: one installment collected in full. */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "company_id")
	private Company company;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "loan_id")
	private Loan loan;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "installment_id")
	private Installment installment;

	@Column(nullable = false)
	private int seq;

	@Column(name = "receipt_no", nullable = false)
	private String receiptNo;

	@Column(nullable = false)
	private long amount;

	/** When the money changed hands, which may be earlier than when it was posted. */
	@Column(name = "paid_on", nullable = false)
	private LocalDate paidOn;

	@Column(name = "days_late", nullable = false)
	private int daysLate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private PaymentMode mode;

	@Column(name = "posted_at", nullable = false)
	private Instant postedAt;

	// Where the officer stood when receipting, if the device could tell.
	@Column(name = "geo_lat", precision = 9, scale = 6)
	private BigDecimal geoLat;

	@Column(name = "geo_lng", precision = 9, scale = 6)
	private BigDecimal geoLng;

	@Column(name = "geo_accuracy", precision = 8, scale = 2)
	private BigDecimal geoAccuracy;

	@Column(name = "collected_by_id")
	private Long collectedById;

	@Column(name = "client_op_id")
	private String clientOpId;
}
