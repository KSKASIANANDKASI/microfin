package com.microfin.lms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** The last number handed out for one kind of code (line, customer, application, loan) in a company. */
@Entity
@Table(name = "code_counters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CodeCounter {

	@EmbeddedId
	private Key key;

	@Column(name = "last_value", nullable = false)
	private long lastValue;

	@Embeddable
	@Getter
	@NoArgsConstructor
	@AllArgsConstructor
	@EqualsAndHashCode
	public static class Key implements Serializable {

		@Column(name = "company_id")
		private Long companyId;

		private String name;
	}
}
