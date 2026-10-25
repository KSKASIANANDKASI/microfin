package com.microfin.lms.common;

import com.microfin.lms.config.AppProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/** The business calendar day: due dates and receipts follow the branch's zone, not the server's. */
@Component
public class Today {

	private final Clock clock;
	private final AppProperties properties;

	public Today(Clock clock, AppProperties properties) {
		this.clock = clock;
		this.properties = properties;
	}

	public LocalDate date() {
		return LocalDate.now(clock.withZone(properties.zone()));
	}

	public Instant instant() {
		return clock.instant();
	}
}
