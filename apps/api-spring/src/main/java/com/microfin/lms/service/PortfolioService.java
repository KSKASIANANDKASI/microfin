package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.Today;
import com.microfin.lms.domain.Company;
import com.microfin.lms.domain.Customer;
import com.microfin.lms.domain.Enums.Frequency;
import com.microfin.lms.domain.Enums.LoanType;
import com.microfin.lms.domain.Enums.PaymentMode;
import com.microfin.lms.domain.Installment;
import com.microfin.lms.domain.Line;
import com.microfin.lms.domain.Loan;
import com.microfin.lms.domain.Payment;
import com.microfin.lms.repo.CompanyRepository;
import com.microfin.lms.repo.InstallmentRepository;
import com.microfin.lms.repo.LineRepository;
import com.microfin.lms.repo.LoanRepository;
import com.microfin.lms.repo.PaymentRepository;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.CustomerService.CustomerView;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Everything that is read off the loan book: where each loan stands, today's collection sheet,
 * each line's figures and its walking route. Balances are never stored; they are derived from
 * the installments here, so there is one source of truth.
 */
@Service
public class PortfolioService {

	// ---- views ----

	/** status: paid | overdue | due | upcoming. daysLate is as of today for unpaid rows, at payment for paid ones. */
	public record ScheduleRowView(int seq, LocalDate dueOn, long amount, long balanceAfter, String status, int daysLate,
			LocalDate paidOn) {
	}

	public record RepaymentView(String receiptNo, int seq, LocalDate paidOn, long amount, int daysLate, PaymentMode mode,
			Instant postedAt, GeoPoint geo) {

		public static RepaymentView of(Payment p) {
			return new RepaymentView(p.getReceiptNo(), p.getSeq(), p.getPaidOn(), p.getAmount(), p.getDaysLate(),
					p.getMode(), p.getPostedAt(), GeoPoint.of(p.getGeoLat(), p.getGeoLng()));
		}
	}

	public record LoanView(String id, String customerId, String customerName, String customerPhone, String lineId,
			String lineName, LoanType type, long principal, BigDecimal annualRatePct, int months, long fee, long emi,
			LocalDate disbursedOn) {
	}

	/** state: active | overdue | closed. */
	public record LoanSummary(long totalInterest, long totalPayable, long netDisbursal, long paid, long outstanding,
			ScheduleRowView next, String state, int daysLate, long overdueAmount, int installmentsPaid,
			int installmentsTotal) {
	}

	/** repayments: days late of each collected installment, oldest first, so a client can rebuild the schedule. */
	public record LoanBookEntry(LoanView loan, LoanSummary summary, List<Integer> repayments) {
	}

	public record LoanDetail(LoanView loan, CustomerView customer, LoanSummary summary, List<ScheduleRowView> schedule,
			List<RepaymentView> repayments) {
	}

	/** One row of today's collection sheet. status: due | overdue | collected. */
	public record SheetItem(String id, String customer, String customerId, String loanNo, int seq, String lineId,
			long amount, LocalDate dueOn, int daysLate, String status) {
	}

	public record LineView(String id, String name, String officer, Long officerId, Frequency frequency, String schedule,
			int accounts, long due, long collected) {
	}

	public record RouteStop(SheetItem installment, CustomerView customer, GeoPoint geo, double legKm) {
	}

	public record CollectedStop(SheetItem installment, CustomerView customer, Instant postedAt, GeoPoint postedFrom,
			Double awayKm) {
	}

	public record LineRoute(GeoPoint office, List<RouteStop> stops, List<CollectedStop> collected, List<SheetItem> unmapped,
			double totalKm) {
	}

	/** A loan with its schedule resolved against today. Internal; the records above are what leave. */
	public static final class LoanState {

		public final Loan loan;
		public final List<ScheduleRowView> schedule;
		public final LoanSummary summary;
		/** Days late of each collected installment, oldest first. */
		public final List<Integer> lateness;

		LoanState(Loan loan, List<Installment> installments, LocalDate today) {
			this.loan = loan;
			this.schedule = installments.stream().map(i -> row(i, today)).toList();
			this.lateness = schedule.stream().filter(r -> r.status().equals("paid")).map(ScheduleRowView::daysLate).toList();

			long paid = schedule.stream().filter(r -> r.status().equals("paid")).mapToLong(ScheduleRowView::amount).sum();
			ScheduleRowView next = schedule.stream().filter(r -> !r.status().equals("paid")).findFirst().orElse(null);
			int daysLate = next != null && next.status().equals("overdue") ? next.daysLate() : 0;
			long overdueAmount = schedule.stream().filter(r -> r.status().equals("overdue")).mapToLong(ScheduleRowView::amount).sum();
			String state = next == null ? "closed" : daysLate > 0 ? "overdue" : "active";
			this.summary = new LoanSummary(loan.getTotalInterest(), loan.getTotalPayable(), loan.getNetDisbursal(), paid,
					loan.getTotalPayable() - paid, next, state, daysLate, overdueAmount, lateness.size(), schedule.size());
		}

		private static ScheduleRowView row(Installment i, LocalDate today) {
			if (i.isPaid()) {
				int late = (int) Math.max(0, ChronoUnit.DAYS.between(i.getDueOn(), i.getPaidOn()));
				return new ScheduleRowView(i.getSeq(), i.getDueOn(), i.getAmount(), i.getBalanceAfter(), "paid", late, i.getPaidOn());
			}
			long offset = ChronoUnit.DAYS.between(today, i.getDueOn());
			String status = offset < 0 ? "overdue" : offset == 0 ? "due" : "upcoming";
			return new ScheduleRowView(i.getSeq(), i.getDueOn(), i.getAmount(), i.getBalanceAfter(), status,
					offset < 0 ? (int) -offset : 0, null);
		}

		public boolean isOpen() {
			return !summary.state().equals("closed");
		}

		public LoanView view() {
			Customer c = loan.getCustomer();
			return new LoanView(loan.getLoanNo(), c.getCode(), c.getName(), c.getPhone(), loan.getLine().getCode(),
					loan.getLine().getName(), loan.getType(), loan.getPrincipal(), loan.getAnnualRatePct(), loan.getMonths(),
					loan.getFee(), loan.getEmi(), loan.getDisbursedOn());
		}
	}

	private final LoanRepository loans;
	private final InstallmentRepository installments;
	private final PaymentRepository payments;
	private final LineRepository lines;
	private final CompanyRepository companies;
	private final Today today;

	public PortfolioService(LoanRepository loans, InstallmentRepository installments, PaymentRepository payments,
			LineRepository lines, CompanyRepository companies, Today today) {
		this.loans = loans;
		this.installments = installments;
		this.payments = payments;
		this.lines = lines;
		this.companies = companies;
		this.today = today;
	}

	// ---- loan book ----

	/** Every loan of the company, newest disbursal first. */
	@Transactional(readOnly = true)
	public List<LoanState> states(Long companyId) {
		return states(LineScope.company(companyId));
	}

	/** Every loan on the lines in scope, newest disbursal first. */
	@Transactional(readOnly = true)
	public List<LoanState> states(LineScope scope) {
		LocalDate now = today.date();
		Map<Long, List<Installment>> byLoan = installments.findAllForCompany(scope.companyId()).stream()
				.collect(Collectors.groupingBy(i -> i.getLoan().getId()));
		return loans.findByCompanyIdOrderByDisbursedOnDescIdDesc(scope.companyId()).stream()
				.filter(loan -> scope.covers(loan.getLine()))
				.map(loan -> new LoanState(loan, byLoan.getOrDefault(loan.getId(), List.of()), now))
				.toList();
	}

	/** sort: newest (default) | late | outstanding. state: all | active | overdue | closed. */
	@Transactional(readOnly = true)
	public List<LoanBookEntry> book(CurrentUser current, String query, String state, String lineId, String customerId,
			String sort) {
		String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
		List<LoanState> rows = new ArrayList<>(states(LineScope.of(current)).stream()
				.filter(s -> state == null || state.equals("all") || s.summary.state().equals(state))
				.filter(s -> lineId == null || lineId.equals("all") || s.loan.getLine().getCode().equals(lineId))
				.filter(s -> customerId == null || s.loan.getCustomer().getCode().equals(customerId))
				.filter(s -> needle.isEmpty() || s.loan.getLoanNo().toLowerCase(Locale.ROOT).contains(needle)
						|| s.loan.getCustomer().getName().toLowerCase(Locale.ROOT).contains(needle)
						|| s.loan.getCustomer().getPhone().contains(needle))
				.toList());
		if ("late".equals(sort)) {
			rows.sort(Comparator.comparingInt((LoanState s) -> s.summary.daysLate()).reversed());
		} else if ("outstanding".equals(sort)) {
			rows.sort(Comparator.comparingLong((LoanState s) -> s.summary.outstanding()).reversed());
		}
		return rows.stream().map(s -> new LoanBookEntry(s.view(), s.summary, s.lateness)).toList();
	}

	@Transactional(readOnly = true)
	public LoanDetail detail(CurrentUser current, String loanNo) {
		Loan loan = loans.findByCompanyIdAndLoanNo(current.companyId(), loanNo).orElseThrow(() -> ApiException.notFound("Loan"));
		LineScope.of(current).require(loan.getLine(), "Loan");
		LoanState state = new LoanState(loan, installments.findByLoanIdOrderBySeqAsc(loan.getId()), today.date());
		List<RepaymentView> repayments = payments.findByLoanIdOrderBySeqDesc(loan.getId()).stream().map(RepaymentView::of).toList();
		return new LoanDetail(state.view(), CustomerView.of(loan.getCustomer()), state.summary, state.schedule, repayments);
	}

	// ---- collection sheet ----

	/**
	 * Today's sheet: for each open loan, the installments already collected today plus the next
	 * one that is due or overdue. Installments are collected oldest first, so only the first
	 * unpaid one is ever offered.
	 */
	@Transactional(readOnly = true)
	public List<SheetItem> sheet(LineScope scope, String lineId) {
		return sheet(states(scope), lineId);
	}

	List<SheetItem> sheet(List<LoanState> states, String lineId) {
		LocalDate now = today.date();
		List<SheetItem> items = new ArrayList<>();
		for (LoanState state : states) {
			if (lineId != null && !state.loan.getLine().getCode().equals(lineId)) {
				continue;
			}
			for (ScheduleRowView row : state.schedule) {
				if (row.status().equals("paid") && now.equals(row.paidOn())) {
					items.add(item(state, row, "collected", 0));
				}
			}
			ScheduleRowView next = state.summary.next();
			if (next != null && !next.status().equals("upcoming")) {
				items.add(item(state, next, next.status(), next.daysLate()));
			}
		}
		return items;
	}

	private static SheetItem item(LoanState state, ScheduleRowView row, String status, int daysLate) {
		Loan loan = state.loan;
		return new SheetItem(loan.getLoanNo() + "-" + row.seq(), loan.getCustomer().getName(), loan.getCustomer().getCode(),
				loan.getLoanNo(), row.seq(), loan.getLine().getCode(), row.amount(), row.dueOn(), daysLate, status);
	}

	// ---- lines ----

	/** Each line with today's figures: what the sheet asks for and what has come in. */
	@Transactional(readOnly = true)
	public List<LineView> lines(LineScope scope) {
		List<LoanState> states = states(scope);
		List<SheetItem> sheet = sheet(states, null);
		return lines.findByCompanyIdOrderByCodeAsc(scope.companyId()).stream().filter(scope::covers)
				.map(line -> lineView(line, states, sheet)).toList();
	}

	@Transactional(readOnly = true)
	public LineView line(LineScope scope, String code) {
		Line line = scope.require(
				lines.findByCompanyIdAndCode(scope.companyId(), code).orElseThrow(() -> ApiException.notFound("Line")), "Line");
		List<LoanState> states = states(scope);
		return lineView(line, states, sheet(states, null));
	}

	private static LineView lineView(Line line, List<LoanState> states, List<SheetItem> sheet) {
		String code = line.getCode();
		int accounts = (int) states.stream().filter(s -> s.isOpen() && s.loan.getLine().getCode().equals(code)).count();
		long due = sheet.stream().filter(i -> i.lineId().equals(code)).mapToLong(SheetItem::amount).sum();
		long collected = sheet.stream().filter(i -> i.lineId().equals(code) && i.status().equals("collected"))
				.mapToLong(SheetItem::amount).sum();
		return new LineView(code, line.getName(), line.officerName(), line.getOfficer() == null ? null : line.getOfficer().getId(),
				line.getFrequency(), line.getSchedule(), accounts, due, collected);
	}

	// ---- route ----

	/**
	 * Orders a line's sheet into a walkable route: nearest unvisited doorstep first, starting from
	 * the office. Distances are straight-line; the road will be longer. Collected stops move to
	 * their own list, so the route shrinks as the officer receipts.
	 */
	@Transactional(readOnly = true)
	public LineRoute route(LineScope scope, String lineCode) {
		Long companyId = scope.companyId();
		scope.require(lines.findByCompanyIdAndCode(companyId, lineCode).orElseThrow(() -> ApiException.notFound("Line")), "Line");
		Company company = companies.findById(companyId).orElseThrow(() -> ApiException.notFound("Company"));
		GeoPoint office = GeoPoint.of(company.getOfficeLat(), company.getOfficeLng());

		List<LoanState> states = states(scope);
		Map<String, LoanState> byLoanNo = states.stream().collect(Collectors.toMap(s -> s.loan.getLoanNo(), Function.identity()));
		LocalDate now = today.date();
		Map<String, Payment> todaysReceipts = payments.findInRange(companyId, now, now).stream()
				.collect(Collectors.toMap(p -> p.getLoan().getLoanNo() + "-" + p.getSeq(), Function.identity(), (a, b) -> a));

		record Pending(SheetItem item, Customer customer, GeoPoint geo) {
		}
		List<Pending> pending = new ArrayList<>();
		List<SheetItem> unmapped = new ArrayList<>();
		List<CollectedStop> collected = new ArrayList<>();

		for (SheetItem item : sheet(states, lineCode)) {
			Customer customer = byLoanNo.get(item.loanNo()).loan.getCustomer();
			GeoPoint doorstep = GeoPoint.of(customer.getGeoLat(), customer.getGeoLng());
			if (item.status().equals("collected")) {
				Payment receipt = todaysReceipts.get(item.id());
				GeoPoint postedFrom = receipt == null ? null : GeoPoint.of(receipt.getGeoLat(), receipt.getGeoLng());
				Double awayKm = postedFrom != null && doorstep != null ? postedFrom.distanceKm(doorstep) : null;
				collected.add(new CollectedStop(item, CustomerView.of(customer), receipt == null ? null : receipt.getPostedAt(),
						postedFrom, awayKm));
			} else if (doorstep != null) {
				pending.add(new Pending(item, customer, doorstep));
			} else {
				unmapped.add(item);
			}
		}

		List<RouteStop> stops = new ArrayList<>();
		// Without an office on file the walk simply starts at the first doorstep.
		GeoPoint here = office;
		double totalKm = 0;
		while (!pending.isEmpty()) {
			final GeoPoint from = here;
			Pending nearest = from == null ? pending.get(0)
					: pending.stream().min(Comparator.comparingDouble(p -> from.distanceKm(p.geo()))).orElseThrow();
			pending.remove(nearest);
			double leg = from == null ? 0 : from.distanceKm(nearest.geo());
			stops.add(new RouteStop(nearest.item(), CustomerView.of(nearest.customer()), nearest.geo(), leg));
			totalKm += leg;
			here = nearest.geo();
		}
		if (!stops.isEmpty() && office != null) {
			totalKm += here.distanceKm(office);
		}
		collected.sort(Comparator.comparing(CollectedStop::postedAt, Comparator.nullsLast(Comparator.naturalOrder())));
		return new LineRoute(office, stops, collected, unmapped, totalKm);
	}
}
