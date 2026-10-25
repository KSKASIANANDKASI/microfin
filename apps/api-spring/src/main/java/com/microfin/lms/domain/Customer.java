package com.microfin.lms.domain;

import com.microfin.lms.domain.Enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/** A borrower on a line. */
@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "company_id")
	private Company company;

	@Column(nullable = false)
	private String code;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "line_id")
	private Line line;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String phone;

	@Column(name = "alt_phone")
	private String altPhone;

	@Column(name = "parent_name", nullable = false)
	private String parentName;

	@Column(nullable = false)
	private String address;

	@Column(name = "requested_amount", nullable = false)
	private long requestedAmount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private CustomerStatus status;

	// Doorstep pin, captured during onboarding.
	@Column(name = "geo_lat", precision = 9, scale = 6)
	private BigDecimal geoLat;

	@Column(name = "geo_lng", precision = 9, scale = 6)
	private BigDecimal geoLng;

	@Column(name = "geo_accuracy", precision = 8, scale = 2)
	private BigDecimal geoAccuracy;

	@Column(name = "geo_captured_at")
	private Instant geoCapturedAt;

	// KYC identity proofs, at most one per ID type. Empty until an officer captures one.
	@OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("id")
	@BatchSize(size = 100)
	private List<CustomerIdProof> proofs = new ArrayList<>();

	@Column(name = "created_by")
	private Long createdBy;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	public boolean hasProof() {
		return !proofs.isEmpty();
	}

	public Optional<CustomerIdProof> proof(IdType type) {
		return proofs.stream().filter(p -> p.getIdType() == type).findFirst();
	}

	public boolean hasGeo() {
		return geoLat != null && geoLng != null;
	}
}
