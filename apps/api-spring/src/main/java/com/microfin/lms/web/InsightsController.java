package com.microfin.lms.web;

import com.microfin.lms.common.Today;
import com.microfin.lms.domain.AuditLog;
import com.microfin.lms.repo.AuditLogRepository;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.InsightsService;
import com.microfin.lms.service.LineScope;
import com.microfin.lms.service.InsightsService.Dashboard;
import com.microfin.lms.service.InsightsService.Insights;
import com.microfin.lms.service.ReportService;
import com.microfin.lms.service.ReportService.Range;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Dashboard, insights, the six reports and the audit trail. */
@RestController
public class InsightsController {

	private final InsightsService insights;
	private final ReportService reports;
	private final AuditLogRepository auditLogs;
	private final Today today;

	public InsightsController(InsightsService insights, ReportService reports, AuditLogRepository auditLogs, Today today) {
		this.insights = insights;
		this.reports = reports;
		this.auditLogs = auditLogs;
		this.today = today;
	}

	@GetMapping("/health")
	public Map<String, Boolean> health() {
		return Map.of("ok", true);
	}

	@GetMapping("/api/v1/dashboard")
	public Dashboard dashboard() {
		return insights.dashboard(LineScope.of(CurrentUser.get()));
	}

	@GetMapping("/api/v1/insights")
	public Insights insights() {
		return insights.insights(LineScope.of(CurrentUser.get()));
	}

	@GetMapping("/api/v1/reports/portfolio-summary")
	@PreAuthorize(UserController.MANAGERS)
	public Object portfolioSummary() {
		return reports.portfolioSummary(CurrentUser.get().companyId());
	}

	@GetMapping("/api/v1/reports/collection-register")
	@PreAuthorize(UserController.MANAGERS)
	public Object collectionRegister(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@RequestParam(required = false) String lineId) {
		return reports.collectionRegister(CurrentUser.get().companyId(), range(from, to), lineId);
	}

	@GetMapping("/api/v1/reports/overdue-ageing")
	@PreAuthorize(UserController.MANAGERS)
	public Object overdueAgeing() {
		return reports.overdueAgeing(CurrentUser.get().companyId());
	}

	@GetMapping("/api/v1/reports/disbursement-register")
	@PreAuthorize(UserController.MANAGERS)
	public Object disbursementRegister(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return reports.disbursementRegister(CurrentUser.get().companyId(), range(from, to));
	}

	@GetMapping("/api/v1/reports/line-performance")
	@PreAuthorize(UserController.MANAGERS)
	public Object linePerformance(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return reports.linePerformance(CurrentUser.get().companyId(), range(from, to));
	}

	@GetMapping("/api/v1/reports/day-book")
	@PreAuthorize(UserController.MANAGERS)
	public Object dayBook(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return reports.dayBook(CurrentUser.get().companyId(), range(from, to));
	}

	/** The latest 200 audit entries, newest first. */
	@GetMapping("/api/v1/audit-logs")
	@PreAuthorize(UserController.MANAGERS)
	public List<AuditLog> auditLogs() {
		return auditLogs.findTop200ByCompanyIdOrderByIdDesc(CurrentUser.get().companyId());
	}

	/** With no dates given, the current month up to today. */
	private Range range(LocalDate from, LocalDate to) {
		LocalDate end = to == null ? today.date() : to;
		return new Range(from == null ? end.withDayOfMonth(1) : from, end);
	}
}
