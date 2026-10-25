package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.AuditService;
import com.microfin.lms.common.CodeService;
import com.microfin.lms.domain.Enums.Frequency;
import com.microfin.lms.domain.Enums.UserStatus;
import com.microfin.lms.domain.Line;
import com.microfin.lms.domain.User;
import com.microfin.lms.repo.CompanyRepository;
import com.microfin.lms.repo.LineRepository;
import com.microfin.lms.repo.UserRepository;
import com.microfin.lms.security.CurrentUser;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creating and editing collection lines. Their daily figures come from {@link PortfolioService}. */
@Service
public class LineService {

	public record LineInput(String name, Frequency frequency, String schedule, Long officerId) {
	}

	private static final List<String> WEEKDAYS = List.of("Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
			"Saturday", "Sunday");

	private final LineRepository lines;
	private final UserRepository users;
	private final CompanyRepository companies;
	private final CodeService codes;
	private final AuditService audit;
	private final Clock clock;

	public LineService(LineRepository lines, UserRepository users, CompanyRepository companies, CodeService codes,
			AuditService audit, Clock clock) {
		this.lines = lines;
		this.users = users;
		this.companies = companies;
		this.codes = codes;
		this.audit = audit;
		this.clock = clock;
	}

	@Transactional
	public String create(CurrentUser current, LineInput input) {
		if (lines.existsByCompanyIdAndNameIgnoreCase(current.companyId(), input.name().trim())) {
			throw ApiException.conflict("LINE_NAME_TAKEN", "A line with this name already exists");
		}
		Line line = new Line();
		line.setCompany(companies.getReferenceById(current.companyId()));
		line.setCreatedAt(clock.instant());
		apply(current, line, input);
		// Minted last, so a rejected request does not use up a number.
		line.setCode(codes.next(current.companyId(), CodeService.Kind.LINE));
		lines.save(line);
		audit.record(current, "LINE_CREATED", "LINE", line.getCode(), line.getName());
		return line.getCode();
	}

	@Transactional
	public void update(CurrentUser current, String code, LineInput input) {
		Line line = lines.findByCompanyIdAndCode(current.companyId(), code).orElseThrow(() -> ApiException.notFound("Line"));
		String name = input.name().trim();
		if (!line.getName().equalsIgnoreCase(name) && lines.existsByCompanyIdAndNameIgnoreCase(current.companyId(), name)) {
			throw ApiException.conflict("LINE_NAME_TAKEN", "A line with this name already exists");
		}
		apply(current, line, input);
		audit.record(current, "LINE_UPDATED", "LINE", line.getCode(), line.officerName());
	}

	private void apply(CurrentUser current, Line line, LineInput input) {
		line.setName(input.name().trim());
		line.setFrequency(input.frequency());
		line.setSchedule(schedule(input.frequency(), input.schedule()));
		if (input.officerId() == null) {
			line.setOfficer(null);
		} else {
			User officer = users.findByIdAndCompanyId(input.officerId(), current.companyId())
					.filter(u -> u.getStatus() == UserStatus.ACTIVE)
					.orElseThrow(() -> ApiException.badRequest("UNKNOWN_OFFICER", "Choose an active staff member"));
			line.setOfficer(officer);
		}
	}

	/** Weekly lines need a weekday; monthly ones a day 1-28 or "Last day"; daily lines take neither. */
	private static String schedule(Frequency frequency, String value) {
		String schedule = value == null ? "" : value.trim();
		switch (frequency) {
			case DAILY:
				return null;
			case WEEKLY:
				if (!WEEKDAYS.contains(schedule)) {
					throw ApiException.badRequest("SCHEDULE_REQUIRED", "Choose the weekday this line collects on");
				}
				return schedule;
			default:
				if (!schedule.equals("Last day") && !schedule.matches("[1-9]|1\\d|2[0-8]")) {
					throw ApiException.badRequest("SCHEDULE_REQUIRED", "Choose the day of the month (1-28 or Last day)");
				}
				return schedule;
		}
	}
}
