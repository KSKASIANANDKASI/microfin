package com.microfin.lms.web;

/** Validation patterns and limits shared by request bodies. They match the checks the apps make. */
public final class Rules {

	private Rules() {
	}

	/** Indian mobile number: ten digits starting 6-9. */
	public static final String PHONE = "[6-9]\\d{9}";
	public static final String PHONE_MESSAGE = "must be a 10-digit mobile number";

	public static final int PASSWORD_MIN = 8;
	public static final int PASSWORD_MAX = 72; // bcrypt ignores anything beyond 72 bytes

	public static final long MIN_AMOUNT = 1_000;
	public static final long MAX_AMOUNT = 1_000_000;
	public static final String MAX_RATE = "60";
	public static final int MAX_TENURE = 60;
	/** A disbursal can be back-dated for a late entry, but not booked far ahead. */
	public static final int MAX_DAYS_AHEAD = 7;
}
