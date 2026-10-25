package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.AuditService;
import com.microfin.lms.domain.Company;
import com.microfin.lms.domain.Enums.Role;
import com.microfin.lms.domain.Enums.UserStatus;
import com.microfin.lms.domain.User;
import com.microfin.lms.repo.CompanyRepository;
import com.microfin.lms.repo.UserRepository;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.AuthService.UserView;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Staff accounts and the company's own settings. */
@Service
public class UserService {

	public record OfficerView(Long id, String name, Role role) {
	}

	public record CompanyView(String name, GeoPoint office, long dailyTarget) {

		static CompanyView of(Company company) {
			return new CompanyView(company.getName(), GeoPoint.of(company.getOfficeLat(), company.getOfficeLng()),
					company.getDailyTarget());
		}
	}

	private final UserRepository users;
	private final CompanyRepository companies;
	private final AuthService auth;
	private final AuditService audit;
	private final Clock clock;

	public UserService(UserRepository users, CompanyRepository companies, AuthService auth, AuditService audit, Clock clock) {
		this.users = users;
		this.companies = companies;
		this.auth = auth;
		this.audit = audit;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<UserView> list(CurrentUser current) {
		return users.findByCompanyIdOrderByFullNameAsc(current.companyId()).stream().map(UserView::of).toList();
	}

	/** Active staff a line can be assigned to. */
	@Transactional(readOnly = true)
	public List<OfficerView> officers(CurrentUser current) {
		return users.findByCompanyIdOrderByFullNameAsc(current.companyId()).stream()
				.filter(u -> u.getStatus() == UserStatus.ACTIVE)
				.map(u -> new OfficerView(u.getId(), u.getFullName(), u.getRole()))
				.toList();
	}

	@Transactional
	public UserView create(CurrentUser current, String fullName, String email, String phone, String password, Role role) {
		requireMayGrant(current, role);
		String login = AuthService.normalizeEmail(email);
		if (users.existsByEmail(login)) {
			throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists");
		}
		Company company = companies.getReferenceById(current.companyId());
		User user = auth.newUser(company, fullName, login, phone, password, role, clock.instant());
		audit.record(current, "USER_CREATED", "USER", String.valueOf(user.getId()), role.name());
		return UserView.of(user);
	}

	@Transactional
	public UserView update(CurrentUser current, Long userId, String fullName, String phone, Role role, UserStatus status) {
		User user = users.findByIdAndCompanyId(userId, current.companyId()).orElseThrow(() -> ApiException.notFound("User"));
		boolean self = user.getId().equals(current.id());
		if (fullName != null) {
			user.setFullName(fullName.trim());
		}
		if (phone != null) {
			user.setPhone(phone);
		}
		if (role != null && role != user.getRole()) {
			// Nobody changes their own role: an admin demoting themselves could leave no admin.
			if (self) {
				throw ApiException.badRequest("OWN_ROLE", "You cannot change your own role");
			}
			requireMayGrant(current, role);
			requireMayGrant(current, user.getRole());
			user.setRole(role);
		}
		if (status != null && status != user.getStatus()) {
			if (self) {
				throw ApiException.badRequest("OWN_STATUS", "You cannot suspend your own account");
			}
			requireMayGrant(current, user.getRole());
			user.setStatus(status);
		}
		audit.record(current, "USER_UPDATED", "USER", String.valueOf(user.getId()), user.getRole() + " " + user.getStatus());
		return UserView.of(user);
	}

	/** Managers run field staff; only an admin can create or alter managers and admins. */
	private static void requireMayGrant(CurrentUser current, Role role) {
		if (role != Role.LOAN_OFFICER && current.role() != Role.ADMIN) {
			throw ApiException.forbidden("Only an admin can manage manager and admin accounts");
		}
	}

	@Transactional(readOnly = true)
	public CompanyView company(CurrentUser current) {
		return CompanyView.of(companies.findById(current.companyId()).orElseThrow(() -> ApiException.notFound("Company")));
	}

	@Transactional
	public CompanyView updateCompany(CurrentUser current, String name, GeoPoint office, Long dailyTarget) {
		Company company = companies.findById(current.companyId()).orElseThrow(() -> ApiException.notFound("Company"));
		if (name != null) {
			company.setName(name.trim());
		}
		if (office != null) {
			company.setOfficeLat(BigDecimal.valueOf(office.lat()));
			company.setOfficeLng(BigDecimal.valueOf(office.lng()));
		}
		if (dailyTarget != null) {
			company.setDailyTarget(dailyTarget);
		}
		audit.record(current, "COMPANY_UPDATED", "COMPANY", String.valueOf(company.getId()), null);
		return CompanyView.of(company);
	}
}
