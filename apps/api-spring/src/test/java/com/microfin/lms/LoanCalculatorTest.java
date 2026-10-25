package com.microfin.lms;

import static org.assertj.core.api.Assertions.assertThat;

import com.microfin.lms.domain.Enums.LoanType;
import com.microfin.lms.loan.LoanCalculator;
import com.microfin.lms.loan.LoanCalculator.ScheduleRow;
import com.microfin.lms.loan.LoanCalculator.Terms;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Figures are the ones the web and mobile apps compute for their sample loans. */
class LoanCalculatorTest {

	private static Terms terms(long principal, String rate, int months, long fee, LoanType type) {
		return LoanCalculator.compute(principal, new BigDecimal(rate), months, fee, type);
	}

	@Test
	void postLoanCollectsInterestWithTheInstallments() {
		// LN-20418: 45,000 at 24% for 12 months, fee 900.
		Terms t = terms(45000, "24", 12, 900, LoanType.POST);
		assertThat(t.totalInterest()).isEqualTo(10800);
		assertThat(t.totalPayable()).isEqualTo(55800);
		assertThat(t.emi()).isEqualTo(4650);
		assertThat(t.netDisbursal()).isEqualTo(44100);
	}

	@Test
	void preLoanDeductsInterestAndFeeFromTheCashHandedOver() {
		// LN-20377: 60,000 at 20% for 18 months, fee 1,200.
		Terms t = terms(60000, "20", 18, 1200, LoanType.PRE);
		assertThat(t.totalInterest()).isEqualTo(18000);
		assertThat(t.totalPayable()).isEqualTo(60000);
		assertThat(t.emi()).isEqualTo(3334);
		assertThat(t.netDisbursal()).isEqualTo(40800);
	}

	@Test
	void emiIsRoundedUpToTheRupeeAndInterestToTheNearest() {
		// 25,000 at 24% for 12 months: 31,000 / 12 = 2,583.33 -> 2,584.
		assertThat(terms(25000, "24", 12, 500, LoanType.POST).emi()).isEqualTo(2584);
		// 10,000 at 12.5% for 7 months = 729.166... -> 729; at 13% for 5 months = 541.666... -> 542.
		assertThat(terms(10000, "12.5", 7, 0, LoanType.POST).totalInterest()).isEqualTo(729);
		assertThat(terms(10000, "13", 5, 0, LoanType.POST).totalInterest()).isEqualTo(542);
	}

	@Test
	void lastInstallmentTakesWhateverIsLeft() {
		// LN-20455: EMI agreed at 2,600 instead of 2,584, so the twelfth installment is smaller.
		List<ScheduleRow> rows = LoanCalculator.schedule(LocalDate.of(2026, 1, 15), 12, 2600, 31000);
		assertThat(rows).hasSize(12);
		assertThat(rows.subList(0, 11)).allMatch(r -> r.amount() == 2600);
		assertThat(rows.get(11).amount()).isEqualTo(2400);
		assertThat(rows.get(11).balanceAfter()).isZero();
		assertThat(rows.stream().mapToLong(ScheduleRow::amount).sum()).isEqualTo(31000);
		assertThat(rows.get(0).dueOn()).isEqualTo(LocalDate.of(2026, 2, 15));
		assertThat(rows.get(11).dueOn()).isEqualTo(LocalDate.of(2027, 1, 15));
	}

	@Test
	void generousEmiClearsTheLoanInFewerInstallments() {
		List<ScheduleRow> rows = LoanCalculator.schedule(LocalDate.of(2026, 1, 15), 6, 5000, 12000);
		assertThat(rows).extracting(ScheduleRow::amount).containsExactly(5000L, 5000L, 2000L);
	}

	@Test
	void loanBookedOnThe31stFallsDueOnTheLastDayOfShorterMonths() {
		List<ScheduleRow> rows = LoanCalculator.schedule(LocalDate.of(2026, 1, 31), 3, 1000, 3000);
		assertThat(rows).extracting(ScheduleRow::dueOn)
				.containsExactly(LocalDate.of(2026, 2, 28), LocalDate.of(2026, 3, 31), LocalDate.of(2026, 4, 30));
	}
}
