package com.microfin.lms.domain;

import com.microfin.lms.domain.Enums.IdType;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One government ID held against a customer. A customer has at most one of each type. */
@Entity
@Table(name = "customer_id_proofs")
@Getter
@Setter
@NoArgsConstructor
public class CustomerIdProof {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "customer_id")
	private Customer customer;

	@Enumerated(EnumType.STRING)
	@Column(name = "id_type", nullable = false)
	private IdType idType;

	/** Normalised (no spaces or hyphens, upper case) and encrypted at rest. */
	@Convert(converter = com.microfin.lms.common.IdNumberCipher.class)
	@Column(name = "id_number", nullable = false)
	private String idNumber;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "front_file_id")
	private StoredFile front;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "back_file_id")
	private StoredFile back;

	@Column(name = "created_by")
	private Long createdBy;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;
}
