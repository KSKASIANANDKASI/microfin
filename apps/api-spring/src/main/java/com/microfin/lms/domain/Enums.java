package com.microfin.lms.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Enumerations shared by the tables. The lower-case ones travel as the strings the apps already use. */
public final class Enums {

	private Enums() {
	}

	public enum Role {
		ADMIN, MANAGER, LOAN_OFFICER;

		/** Managers and admins approve, disburse and configure; officers work the field. */
		public boolean isManager() {
			return this != LOAN_OFFICER;
		}
	}

	public enum UserStatus {
		ACTIVE, SUSPENDED
	}

	/** How often a line collects. MONTHLY_INTEREST collects interest only. */
	public enum Frequency {
		DAILY("daily"), WEEKLY("weekly"), MONTHLY("monthly"), MONTHLY_INTEREST("monthly-interest");

		private final String json;

		Frequency(String json) {
			this.json = json;
		}

		@JsonValue
		public String json() {
			return json;
		}

		@JsonCreator
		public static Frequency of(String value) {
			for (Frequency f : values()) {
				if (f.json.equals(value)) {
					return f;
				}
			}
			throw new IllegalArgumentException("Unknown frequency " + value);
		}
	}

	/** POST: interest is collected with the installments. PRE: interest is deducted from the cash handed over. */
	public enum LoanType {
		POST, PRE
	}

	public enum IdType {
		AADHAAR, PAN, VOTER_ID, DRIVING_LICENSE, PASSPORT
	}

	public enum PaymentMode {
		CASH, UPI
	}

	public enum CustomerStatus {
		PENDING, APPROVED, ACTIVE;

		@JsonValue
		public String json() {
			return name().toLowerCase(Locale.ROOT);
		}

		@JsonCreator
		public static CustomerStatus of(String value) {
			return valueOf(value.toUpperCase(Locale.ROOT));
		}
	}

	public enum ApplicationStatus {
		PENDING, APPROVED, REJECTED, DISBURSED;

		@JsonValue
		public String json() {
			return name().toLowerCase(Locale.ROOT);
		}

		@JsonCreator
		public static ApplicationStatus of(String value) {
			return valueOf(value.toUpperCase(Locale.ROOT));
		}
	}

	public enum LoanStatus {
		ACTIVE, CLOSED
	}
}
