package com.microfin.lms;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** A clock tests can move forward, so installments fall due without waiting a month. */
public class MutableClock extends Clock {

	private volatile Instant now = Instant.parse("2026-03-10T05:00:00Z");

	public void advance(Duration by) {
		now = now.plus(by);
	}

	@Override
	public Instant instant() {
		return now;
	}

	@Override
	public ZoneId getZone() {
		return ZoneOffset.UTC;
	}

	@Override
	public Clock withZone(ZoneId zone) {
		return Clock.fixed(now, zone);
	}
}
