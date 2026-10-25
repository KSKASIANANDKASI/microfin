package com.microfin.lms.loan;

import com.microfin.lms.domain.Enums.LoanType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Pricing for the flat-interest loans these branches write. Interest accrues on the original
 * principal for the whole tenure; nothing here amortises. All amounts are whole rupees.
 *
 * <p>The two loan types differ only in when the interest is taken: POST collects it with the
 * installments, PRE deducts it from the cash handed over so installments repay principal only.
 *
 * <p>This is the server-side twin of {@code lib/loan.ts} in the web and mobile apps and must
 * give the same figures.
 */
public final class LoanCalculator {

	private static final BigDecimal MONTHS_PER_YEAR_PCT = BigDecimal.valueOf(1200);

	private LoanCalculator() {
	}

	public record Terms(long totalInterest,
			/** What the schedule has to recover across the tenure. */
			long totalPayable,
			/** Rounded up to the rupee; field collections do not handle paise. */
			long emi,
			/** Cash actually handed over at disbursal. */
			long netDisbursal) {
	}

	public record ScheduleRow(int seq, LocalDate dueOn, long amount, long balanceAfter) {
	}

	public static Terms compute(long principal, BigDecimal annualRatePct, int months, long fee, LoanType type) {
		if (principal <= 0 || months <= 0 || annualRatePct.signum() < 0) {
			throw new IllegalArgumentException("Principal and tenure must be positive and the rate not negative");
		}
		long totalInterest = BigDecimal.valueOf(principal)
				.multiply(annualRatePct)
				.multiply(BigDecimal.valueOf(months))
				.divide(MONTHS_PER_YEAR_PCT, 0, RoundingMode.HALF_UP)
				.longValueExact();
		long totalPayable = type == LoanType.PRE ? principal : principal + totalInterest;
		long emi = (totalPayable + months - 1) / months;
		long netDisbursal = type == LoanType.PRE ? principal - totalInterest - fee : principal - fee;
		return new Terms(totalInterest, totalPayable, emi, netDisbursal);
	}

	/**
	 * The monthly schedule. Every installment is the EMI except the last, which takes whatever is
	 * left so the schedule recovers exactly {@code totalPayable}; an EMI rounded up would otherwise
	 * overcollect, and can clear the loan in fewer installments than the tenure.
	 *
	 * <p>A loan booked on the 31st falls due on the last day of shorter months.
	 */
	public static List<ScheduleRow> schedule(LocalDate disbursedOn, int months, long emi, long totalPayable) {
		List<ScheduleRow> rows = new ArrayList<>();
		long balance = totalPayable;
		for (int seq = 1; seq <= months && balance > 0; seq++) {
			long amount = seq == months ? balance : Math.min(emi, balance);
			balance -= amount;
			rows.add(new ScheduleRow(seq, disbursedOn.plusMonths(seq), amount, balance));
		}
		return rows;
	}
}
