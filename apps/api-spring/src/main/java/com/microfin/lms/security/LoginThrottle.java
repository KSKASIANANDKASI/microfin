package com.microfin.lms.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Slows password guessing: after 5 failed sign-ins for an email within 15 minutes, further
 * attempts are refused until the window passes. Held in memory, so it is per server instance.
 */
@Component
public class LoginThrottle {

	private static final int MAX_FAILURES = 5;
	private static final Duration WINDOW = Duration.ofMinutes(15);

	private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
	private final Clock clock;

	public LoginThrottle(Clock clock) {
		this.clock = clock;
	}

	public boolean isBlocked(String email) {
		Deque<Instant> recent = failures.get(email);
		if (recent == null) {
			return false;
		}
		synchronized (recent) {
			prune(recent);
			return recent.size() >= MAX_FAILURES;
		}
	}

	public void recordFailure(String email) {
		Deque<Instant> recent = failures.computeIfAbsent(email, k -> new ArrayDeque<>());
		synchronized (recent) {
			prune(recent);
			recent.addLast(clock.instant());
		}
	}

	public void reset(String email) {
		failures.remove(email);
	}

	private void prune(Deque<Instant> recent) {
		Instant cutoff = clock.instant().minus(WINDOW);
		while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) {
			recent.removeFirst();
		}
	}
}
