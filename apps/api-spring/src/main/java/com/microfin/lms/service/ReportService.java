package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.domain.Enums.ApplicationStatus;
import com.microfin.lms.domain.Enums.LoanType;
import com.microfin.lms.domain.Enums.PaymentMode;
import com.microfin.lms.domain.Installment;
import com.microfin.lms.domain.Loan;
import com.microfin.lms.domain.LoanApplication;
import com.microfin.lms.domain.Payment;
import com.microfin.lms.repo.InstallmentRepository;
import com.microfin.lms.repo.LoanApplicationRepository;
import com.microfin.lms.repo.PaymentRepository;
import com.microfin.lms.service.PortfolioService.LoanState;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The six branch reports. Date ranges are inclusive at both ends. */
@Service
public class ReportService {

	public record Range(LocalDate from, LocalDate to) {

		public Range {
			if (from.isAfter(to)) {
				throw ApiException.badRequest("BAD_RANGE", "The start date is after the end date");
			}
			if (from.plusYears(1).isBefore(to)) {
				throw ApiException.badRequest("RANGE_TOO_LONG", "Choose a range of at most one year");
			}
		}

		boolean contains(LocalDate date) {
			return !date.isBefore(from) && !date.isAfter(to);
		}
	}

	// r1
	public record PortfolioRow(String lineId, String line, String officer, int activeLoans, int closedLoans,
			long disbursed, long outstanding, long overdue) {
	}

	// r2
	public record ReceiptRow(String receiptNo, LocalDate paidOn, String loanNo, String customer, String lineId,
			String officer, int seq, long amount, PaymentMode mode, int daysLate) {
	}

	public record CollectionRegister(Range range, List<ReceiptRow> receipts, long total, long cash, long upi) {
	}

	// r3 — bucket: current | 1-30 | 31-60 | 61-90 | 90+
	public record AgeingRow(String lineId, String line, String officer, Map<String, AgeingCell> buckets) {
	}

	public record AgeingCell(int accounts, long overdue, long outstanding) {
	}

	// r4
	public record DisbursementRow(String loanNo, LocalDate disbursedOn, String customer, String lineId, LoanType type,
			long principal, long fee, long interestUpfront, long netDisbursal, String applicationId, String submittedBy,
			LocalDate approvedOn, String note) {
	}

	public record DisbursementRegister(Range range, List<DisbursementRow> loans, long principal, long netDisbursal) {
	}

	// r5 — due: installments falling due in the range; collected: how much of those has come in.
	public record LinePerformanceRow(String lineId, String line, String officer, long due, long collected,
			double efficiency, long arrears, int overdueAccounts) {
	}

	// r6 — closing is the running net across the range, starting from zero.
	public record DayBookRow(LocalDate date, long cashIn, long upiIn, long disbursedOut, long net, long closing) {
	}

	private static final List<String> AGEING_BUCKETS = List.of("current", "1-30", "31-60", "61-90", "90+");

	private final PortfolioService portfolio;
	private final PaymentRepository payments;
	private final InstallmentRepository installments;
	private final LoanApplicationRepository applications;

	public ReportService(PortfolioService portfolio, PaymentRepository payments, InstallmentRepository installments,
			LoanApplicationRepository applications) {
		this.portfolio = portfolio;
		this.payments = payments;
		this.installments = installments;
		this.applications = applications;
	}

	/** Portfolio summary: outstanding, disbursed and closed loans by line. */
	@Transactional(readOnly = true)
	public List<PortfolioRow> portfolioSummary(Long companyId) {
		return byLine(portfolio.states(companyId)).values().stream().map(states -> {
			Loan first = states.get(0).loan;
			List<LoanState> open = states.stream().filter(LoanState::isOpen).toList();
			return new PortfolioRow(first.getLine().getCode(), first.getLine().getName(), first.getLine().officerName(),
					open.size(), states.size() - open.size(), states.stream().mapToLong(s -> s.loan.getPrincipal()).sum(),
					open.stream().mapToLong(s -> s.summary.outstanding()).sum(),
					open.stream().mapToLong(s -> s.summary.overdueAmount()).sum());
		}).toList();
	}

	/** Collection register: every receipt in the range, optionally for one line. */
	@Transactional(readOnly = true)
	public CollectionRegister collectionRegister(Long companyId, Range range, String lineId) {
		List<ReceiptRow> rows = payments.findInRange(companyId, range.from(), range.to()).stream()
				.filter(p -> lineId == null || p.getLoan().getLine().getCode().equals(lineId))
				.map(p -> new ReceiptRow(p.getReceiptNo(), p.getPaidOn(), p.getLoan().getLoanNo(),
						p.getLoan().getCustomer().getName(), p.getLoan().getLine().getCode(), p.getLoan().getLine().officerName(),
						p.getSeq(), p.getAmount(), p.getMode(), p.getDaysLate()))
				.toList();
		long cash = rows.stream().filter(r -> r.mode() == PaymentMode.CASH).mapToLong(ReceiptRow::amount).sum();
		long total = rows.stream().mapToLong(ReceiptRow::amount).sum();
		return new CollectionRegister(range, rows, total, cash, total - cash);
	}

	/** Overdue ageing at 30 / 60 / 90 days, by line. A loan is placed by its oldest unpaid installment. */
	@Transactional(readOnly = true)
	public List<AgeingRow> overdueAgeing(Long companyId) {
		return byLine(portfolio.states(companyId)).values().stream().map(states -> {
			Map<String, int[]> accounts = new LinkedHashMap<>();
			Map<String, long[]> amounts = new LinkedHashMap<>();
			AGEING_BUCKETS.forEach(b -> {
				accounts.put(b, new int[1]);
				amounts.put(b, new long[2]);
			});
			for (LoanState state : states) {
				if (!state.isOpen()) {
					continue;
				}
				int late = state.summary.daysLate();
				String bucket = late == 0 ? "current" : late <= 30 ? "1-30" : late <= 60 ? "31-60" : late <= 90 ? "61-90" : "90+";
				accounts.get(bucket)[0]++;
				amounts.get(bucket)[0] += state.summary.overdueAmount();
				amounts.get(bucket)[1] += state.summary.outstanding();
			}
			Map<String, AgeingCell> cells = new LinkedHashMap<>();
			AGEING_BUCKETS.forEach(b -> cells.put(b, new AgeingCell(accounts.get(b)[0], amounts.get(b)[0], amounts.get(b)[1])));
			Loan first = states.get(0).loan;
			return new AgeingRow(first.getLine().getCode(), first.getLine().getName(), first.getLine().officerName(), cells);
		}).toList();
	}

	/** Disbursement register: every payout in the range with its approval trail. */
	@Transactional(readOnly = true)
	public DisbursementRegister disbursementRegister(Long companyId, Range range) {
		Map<Long, LoanApplication> byLoan = applications.findByCompanyIdOrderByIdDesc(companyId).stream()
				.filter(a -> a.getStatus() == ApplicationStatus.DISBURSED && a.getLoan() != null)
				.collect(Collectors.toMap(a -> a.getLoan().getId(), Function.identity(), (a, b) -> a));
		List<DisbursementRow> rows = portfolio.states(companyId).stream().map(s -> s.loan)
				.filter(loan -> range.contains(loan.getDisbursedOn()))
				.map(loan -> {
					LoanApplication app = byLoan.get(loan.getId());
					return new DisbursementRow(loan.getLoanNo(), loan.getDisbursedOn(), loan.getCustomer().getName(),
							loan.getLine().getCode(), loan.getType(), loan.getPrincipal(), loan.getFee(),
							loan.getType() == LoanType.PRE ? loan.getTotalInterest() : 0, loan.getNetDisbursal(),
							app == null ? null : app.getCode(), app == null ? null : app.getSubmittedBy(),
							app == null ? null : app.getDecidedOn(), app == null ? null : app.getNote());
				}).toList();
		return new DisbursementRegister(range, rows, rows.stream().mapToLong(DisbursementRow::principal).sum(),
				rows.stream().mapToLong(DisbursementRow::netDisbursal).sum());
	}

	/** Line performance: collection efficiency over the range and arrears as they stand today. */
	@Transactional(readOnly = true)
	public List<LinePerformanceRow> linePerformance(Long companyId, Range range) {
		Map<Long, List<Installment>> dueInRange = installments.findAllForCompany(companyId).stream()
				.filter(i -> range.contains(i.getDueOn()))
				.collect(Collectors.groupingBy(i -> i.getLoan().getId()));
		return byLine(portfolio.states(companyId)).values().stream().map(states -> {
			long due = 0;
			long collected = 0;
			for (LoanState state : states) {
				for (Installment i : dueInRange.getOrDefault(state.loan.getId(), List.of())) {
					due += i.getAmount();
					collected += i.isPaid() ? i.getAmount() : 0;
				}
			}
			Loan first = states.get(0).loan;
			return new LinePerformanceRow(first.getLine().getCode(), first.getLine().getName(), first.getLine().officerName(),
					due, collected, due > 0 ? (double) collected / due : 0,
					states.stream().mapToLong(s -> s.summary.overdueAmount()).sum(),
					(int) states.stream().filter(s -> s.summary.state().equals("overdue")).count());
		}).toList();
	}

	/** Day book: money in from receipts and money out in disbursals, per day. */
	@Transactional(readOnly = true)
	public List<DayBookRow> dayBook(Long companyId, Range range) {
		List<Payment> receipts = payments.findInRange(companyId, range.from(), range.to());
		Map<LocalDate, Long> cash = sumByDay(receipts, PaymentMode.CASH);
		Map<LocalDate, Long> upi = sumByDay(receipts, PaymentMode.UPI);
		Map<LocalDate, Long> out = portfolio.states(companyId).stream().map(s -> s.loan)
				.filter(loan -> range.contains(loan.getDisbursedOn()))
				.collect(Collectors.groupingBy(Loan::getDisbursedOn, Collectors.summingLong(Loan::getNetDisbursal)));

		List<DayBookRow> rows = new ArrayList<>();
		long closing = 0;
		for (LocalDate day = range.from(); !day.isAfter(range.to()); day = day.plusDays(1)) {
			long cashIn = cash.getOrDefault(day, 0L);
			long upiIn = upi.getOrDefault(day, 0L);
			long disbursed = out.getOrDefault(day, 0L);
			if (cashIn == 0 && upiIn == 0 && disbursed == 0) {
				continue; // quiet days are left out
			}
			long net = cashIn + upiIn - disbursed;
			closing += net;
			rows.add(new DayBookRow(day, cashIn, upiIn, disbursed, net, closing));
		}
		return rows;
	}

	private static Map<LocalDate, Long> sumByDay(List<Payment> receipts, PaymentMode mode) {
		return receipts.stream().filter(p -> p.getMode() == mode)
				.collect(Collectors.groupingBy(Payment::getPaidOn, Collectors.summingLong(Payment::getAmount)));
	}

	/** Loans grouped by line, in line-code order. Lines with no loans do not appear. */
	private static Map<String, List<LoanState>> byLine(List<LoanState> states) {
		return states.stream().collect(Collectors.groupingBy(s -> s.loan.getLine().getCode(), java.util.TreeMap::new, Collectors.toList()));
	}
}
