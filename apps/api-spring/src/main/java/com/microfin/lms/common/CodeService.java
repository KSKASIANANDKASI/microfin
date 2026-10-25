package com.microfin.lms.common;

import com.microfin.lms.domain.CodeCounter;
import com.microfin.lms.repo.CodeCounterRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Mints the human-readable codes rows are known by: L05, C-0010, APP-3108, LN-20456. */
@Service
public class CodeService {

	public enum Kind {
		LINE("line", 0), CUSTOMER("customer", 0), APPLICATION("application", 3100), LOAN("loan", 20000);

		private final String counter;
		private final long startAfter;

		Kind(String counter, long startAfter) {
			this.counter = counter;
			this.startAfter = startAfter;
		}

		String format(long n) {
			return switch (this) {
				case LINE -> String.format("L%02d", n);
				case CUSTOMER -> String.format("C-%04d", n);
				case APPLICATION -> "APP-" + n;
				case LOAN -> "LN-" + n;
			};
		}
	}

	private final CodeCounterRepository counters;
	private final TransactionTemplate ownTransaction;

	public CodeService(CodeCounterRepository counters, PlatformTransactionManager transactionManager) {
		this.counters = counters;
		// Committed on its own so the counter row is locked only briefly. A number is skipped if
		// the surrounding operation later fails, which is harmless.
		this.ownTransaction = new TransactionTemplate(transactionManager);
		this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}

	public String next(Long companyId, Kind kind) {
		for (int attempt = 1;; attempt++) {
			try {
				Long n = ownTransaction.execute(status -> increment(new CodeCounter.Key(companyId, kind.counter), kind.startAfter));
				return kind.format(n);
			} catch (DataIntegrityViolationException e) {
				// Two callers raced to create the counter row; the loser retries and finds it.
				if (attempt == 3) {
					throw e;
				}
			}
		}
	}

	private long increment(CodeCounter.Key key, long startAfter) {
		CodeCounter counter = counters.findByIdForUpdate(key).orElse(null);
		if (counter == null) {
			counters.saveAndFlush(new CodeCounter(key, startAfter + 1));
			return startAfter + 1;
		}
		counter.setLastValue(counter.getLastValue() + 1);
		return counter.getLastValue();
	}
}
