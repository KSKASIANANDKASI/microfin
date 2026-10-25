package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.Today;
import com.microfin.lms.domain.Company;
import com.microfin.lms.domain.Enums.ApplicationStatus;
import com.microfin.lms.domain.Payment;
import com.microfin.lms.repo.CompanyRepository;
import com.microfin.lms.repo.LoanApplicationRepository;
import com.microfin.lms.repo.PaymentRepository;
import com.microfin.lms.service.PortfolioService.LineView;
import com.microfin.lms.service.PortfolioService.LoanState;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The dashboard figures, collection efficiency, portfolio-at-risk and a per-loan risk score.
 * Everything is derived from the loan book, so it moves as payments are receipted.
 *
 * <p>The risk score is a transparent rule-based score, not a trained model: each factor carries
 * fixed points and is reported back, so an officer can see why a borrower is flagged.
 */
@Service
public class InsightsService {

	// ---- dashboard ----

	/** delta is a percentage change against the comparison period, or null when there is nothing to compare with. */
	public record Kpi(String id, long value, Double delta, boolean currency) {
	}

	public record DayAmount(LocalDate date, long amount) {
	}

	/** bucket: current | overdue1to30 | overdue30plus. amount is the outstanding on those loans. */
	public record ArrearsBucket(String bucket, String tone, int accounts, long amount) {
	}

	public record Dashboard(List<Kpi> kpis, List<DayAmount> collectionsWeek, long dailyTarget, List<ArrearsBucket> arrears,
			List<LineView> lines, int pendingApprovals) {
	}

	// ---- efficiency ----

	public record Ratio(long due, long collected, double efficiency) {
	}

	public record LineEfficiency(String lineId, String name, String officer, long due, long collected, double efficiency) {
	}

	public record OfficerEfficiency(String officer, int lines, long due, long collected, double efficiency) {
	}

	public record WeekEfficiency(long collected, long target, double efficiency, int days) {
	}

	public record Efficiency(Ratio today, List<LineEfficiency> byLine, List<OfficerEfficiency> byOfficer,
			WeekEfficiency week,
			/** Share of installments ever collected that came in on their due date. */
			double onTimeRate,
			/** Mean days late across every collected installment. */
			double avgDaysLate) {
	}

	// ---- risk ----

	/** band: low | medium | high. factors name the rules that fired. */
	public record LoanRisk(String loanId, String customerId, String customer, String lineId, String line,
			long outstanding, long overdueAmount, int daysLate, int installmentsPaid, int installmentsTotal, int score,
			String band, List<String> factors) {
	}

	public record Band(int loans, long outstanding) {
	}

	public record Risk(List<LoanRisk> loans, long outstanding,
			/** Outstanding on loans with any installment overdue, as a share of all outstanding. */
			double par1,
			/** Same, for loans more than 30 days late. */
			double par30, Map<String, Band> bands, List<ArrearsBucket> aging) {
	}

	public record Insights(Efficiency efficiency, Risk risk) {
	}

	public static final String SCORING_METHOD = "Rule-based 0-100: current arrears (40), share of installments paid late (25), "
			+ "mean days late (15), worsening trend over last 3 payments (10), share of loan still outstanding (10). "
			+ "High >= 60, medium >= 30.";

	private final PortfolioService portfolio;
	private final PaymentRepository payments;
	private final CompanyRepository companies;
	private final LoanApplicationRepository applications;
	private final Today today;

	public InsightsService(PortfolioService portfolio, PaymentRepository payments, CompanyRepository companies,
			LoanApplicationRepository applications, Today today) {
		this.portfolio = portfolio;
		this.payments = payments;
		this.companies = companies;
		this.applications = applications;
		this.today = today;
	}

	@Transactional(readOnly = true)
	public Dashboard dashboard(LineScope scope) {
		Long companyId = scope.companyId();
		List<LoanState> states = portfolio.states(scope);
		List<LoanState> open = states.stream().filter(LoanState::isOpen).toList();
		List<DayAmount> week = week(scope);

		long collectedToday = week.get(week.size() - 1).amount();
		long collectedYesterday = week.get(week.size() - 2).amount();
		Double change = collectedYesterday == 0 ? null
				: Math.round((collectedToday - collectedYesterday) * 1000.0 / collectedYesterday) / 10.0;

		List<Kpi> kpis = List.of(
				new Kpi("outstanding", open.stream().mapToLong(s -> s.summary.outstanding()).sum(), null, true),
				new Kpi("collected", collectedToday, change, true),
				new Kpi("overdue", open.stream().mapToLong(s -> s.summary.overdueAmount()).sum(), null, true),
				new Kpi("loans", open.size(), null, false));

		int pending = (int) applications.findByCompanyIdOrderByIdDesc(companyId).stream()
				.filter(a -> a.getStatus() == ApplicationStatus.PENDING && scope.covers(a.getLine())).count();
		return new Dashboard(kpis, week, company(companyId).getDailyTarget(), aging(open), portfolio.lines(scope), pending);
	}

	@Transactional(readOnly = true)
	public Insights insights(LineScope scope) {
		List<LoanState> states = portfolio.states(scope);
		return new Insights(efficiency(scope, states), risk(states));
	}

	/** Collections for the trailing seven days, oldest first, ending today. */
	private List<DayAmount> week(LineScope scope) {
		LocalDate end = today.date();
		LocalDate start = end.minusDays(6);
		Map<LocalDate, Long> byDay = payments.findInRange(scope.companyId(), start, end).stream()
				.filter(p -> scope.covers(p.getLoan().getLine()))
				.collect(Collectors.groupingBy(Payment::getPaidOn, Collectors.summingLong(Payment::getAmount)));
		List<DayAmount> days = new ArrayList<>();
		for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
			days.add(new DayAmount(day, byDay.getOrDefault(day, 0L)));
		}
		return days;
	}

	private static List<ArrearsBucket> aging(List<LoanState> open) {
		long[] amounts = new long[3];
		int[] accounts = new int[3];
		for (LoanState state : open) {
			int late = state.summary.daysLate();
			int bucket = late == 0 ? 0 : late <= 30 ? 1 : 2;
			accounts[bucket]++;
			amounts[bucket] += state.summary.outstanding();
		}
		return List.of(new ArrearsBucket("current", "good", accounts[0], amounts[0]),
				new ArrearsBucket("overdue1to30", "warning", accounts[1], amounts[1]),
				new ArrearsBucket("overdue30plus", "critical", accounts[2], amounts[2]));
	}

	private Efficiency efficiency(LineScope scope, List<LoanState> states) {
		List<LineEfficiency> byLine = portfolio.lines(scope).stream()
				.map(l -> new LineEfficiency(l.id(), l.name(), l.officer(), l.due(), l.collected(), ratio(l.collected(), l.due())))
				.sorted(Comparator.comparingDouble(LineEfficiency::efficiency))
				.toList();

		Map<String, long[]> officers = new LinkedHashMap<>();
		for (LineEfficiency line : byLine) {
			long[] row = officers.computeIfAbsent(line.officer(), k -> new long[3]);
			row[0]++;
			row[1] += line.due();
			row[2] += line.collected();
		}
		List<OfficerEfficiency> byOfficer = officers.entrySet().stream()
				.map(e -> new OfficerEfficiency(e.getKey(), (int) e.getValue()[0], e.getValue()[1], e.getValue()[2],
						ratio(e.getValue()[2], e.getValue()[1])))
				.sorted(Comparator.comparingDouble(OfficerEfficiency::efficiency))
				.toList();

		long due = byLine.stream().mapToLong(LineEfficiency::due).sum();
		long collected = byLine.stream().mapToLong(LineEfficiency::collected).sum();

		List<DayAmount> week = week(scope);
		long weekCollected = week.stream().mapToLong(DayAmount::amount).sum();
		long weekTarget = company(scope.companyId()).getDailyTarget() * week.size();

		List<Integer> lateness = states.stream().flatMap(s -> s.lateness.stream()).toList();
		long onTime = lateness.stream().filter(d -> d == 0).count();

		return new Efficiency(new Ratio(due, collected, ratio(collected, due)), byLine, byOfficer,
				new WeekEfficiency(weekCollected, weekTarget, ratio(weekCollected, weekTarget), week.size()),
				ratio(onTime, lateness.size()), mean(lateness));
	}

	private Risk risk(List<LoanState> states) {
		List<LoanState> open = states.stream().filter(LoanState::isOpen).toList();
		List<LoanRisk> scored = open.stream().map(InsightsService::score)
				.sorted(Comparator.comparingInt(LoanRisk::score).reversed()).toList();

		long outstanding = scored.stream().mapToLong(LoanRisk::outstanding).sum();
		long par1 = scored.stream().filter(l -> l.daysLate() > 0).mapToLong(LoanRisk::outstanding).sum();
		long par30 = scored.stream().filter(l -> l.daysLate() > 30).mapToLong(LoanRisk::outstanding).sum();

		Map<String, Band> bands = new LinkedHashMap<>();
		for (String band : List.of("low", "medium", "high")) {
			List<LoanRisk> in = scored.stream().filter(l -> l.band().equals(band)).toList();
			bands.put(band, new Band(in.size(), in.stream().mapToLong(LoanRisk::outstanding).sum()));
		}
		return new Risk(scored, outstanding, ratio(par1, outstanding), ratio(par30, outstanding), bands, aging(open));
	}

	/**
	 * Points per factor (max 100):
	 * current arrears — days the oldest unpaid installment is late, capped at 30 → 40 pts;
	 * late history — share of past installments paid late → 25 pts;
	 * deep lateness — mean days late when paid, capped at 15 → 15 pts;
	 * worsening — last three payments later than the ones before, by up to 10 days → 10 pts;
	 * early in term — little of the loan repaid yet, so most exposure is still out → 10 pts.
	 */
	static LoanRisk score(LoanState state) {
		List<Integer> history = state.lateness;
		var summary = state.summary;

		double arrearsPts = Math.min(summary.daysLate(), 30) / 30.0 * 40;
		double lateSharePts = ratio(history.stream().filter(d -> d > 0).count(), history.size()) * 25;
		double depthPts = Math.min(mean(history), 15) / 15 * 15;
		int split = Math.max(0, history.size() - 3);
		List<Integer> earlier = history.subList(0, split);
		double drift = earlier.isEmpty() ? 0 : mean(history.subList(split, history.size())) - mean(earlier);
		double trendPts = Math.min(Math.max(drift, 0), 10) / 10 * 10;
		double exposurePts = ratio(summary.outstanding(), summary.totalPayable()) * 10;

		List<String> factors = new ArrayList<>();
		if (arrearsPts >= 10) {
			factors.add("currentArrears");
		}
		if (lateSharePts >= 12.5) {
			factors.add("lateHistory");
		}
		if (depthPts >= 7) {
			factors.add("deepLateness");
		}
		if (trendPts >= 3) {
			factors.add("worsening");
		}
		if (exposurePts >= 7) {
			factors.add("earlyInTerm");
		}
		int score = (int) Math.round(arrearsPts + lateSharePts + depthPts + trendPts + exposurePts);
		var loan = state.loan;
		return new LoanRisk(loan.getLoanNo(), loan.getCustomer().getCode(), loan.getCustomer().getName(),
				loan.getLine().getCode(), loan.getLine().getName(), summary.outstanding(), summary.overdueAmount(),
				summary.daysLate(), history.size(), summary.installmentsTotal(), score,
				score >= 60 ? "high" : score >= 30 ? "medium" : "low", factors);
	}

	/**
	 * What the AI assistant is allowed to see: figures and names, never phone numbers, addresses
	 * or ID proofs. Amounts are whole rupees.
	 */
	@Transactional(readOnly = true)
	public Map<String, Object> assistantSnapshot(LineScope scope) {
		Insights insights = insights(scope);
		Efficiency e = insights.efficiency();
		Risk r = insights.risk();

		Map<String, Object> last7 = new LinkedHashMap<>();
		last7.put("collected", e.week().collected());
		last7.put("target", e.week().target());
		last7.put("pctOfTarget", pct(e.week().efficiency()));
		last7.put("daily", week(scope));

		Map<String, Object> efficiency = new LinkedHashMap<>();
		efficiency.put("todayPct", pct(e.today().efficiency()));
		efficiency.put("todayDue", e.today().due());
		efficiency.put("todayCollected", e.today().collected());
		efficiency.put("last7Days", last7);
		efficiency.put("onTimeRatePct", pct(e.onTimeRate()));
		efficiency.put("avgDaysLate", Math.round(e.avgDaysLate() * 10) / 10.0);
		efficiency.put("byLine", e.byLine().stream().map(l -> Map.of("lineId", l.lineId(), "name", l.name(), "officer",
				l.officer(), "due", l.due(), "collected", l.collected(), "pct", pct(l.efficiency()))).toList());
		efficiency.put("byOfficer", e.byOfficer().stream().map(o -> Map.of("officer", o.officer(), "lines", o.lines(), "due",
				o.due(), "collected", o.collected(), "pct", pct(o.efficiency()))).toList());

		Map<String, Object> risk = new LinkedHashMap<>();
		risk.put("outstanding", r.outstanding());
		risk.put("par1Pct", pct(r.par1()));
		risk.put("par30Pct", pct(r.par30()));
		risk.put("bands", r.bands());
		risk.put("aging", r.aging());
		risk.put("scoringMethod", SCORING_METHOD);
		risk.put("loans", r.loans());

		Map<String, Object> snapshot = new LinkedHashMap<>();
		snapshot.put("asOf", today.date().toString());
		snapshot.put("currency", "INR");
		snapshot.put("collectionEfficiency", efficiency);
		snapshot.put("risk", risk);
		return snapshot;
	}

	private Company company(Long companyId) {
		return companies.findById(companyId).orElseThrow(() -> ApiException.notFound("Company"));
	}

	private static double pct(double value) {
		return Math.round(value * 1000) / 10.0;
	}

	private static double ratio(long part, long whole) {
		return whole > 0 ? (double) part / whole : 0;
	}

	private static double mean(List<Integer> values) {
		return values.isEmpty() ? 0 : values.stream().mapToInt(Integer::intValue).average().orElse(0);
	}
}
