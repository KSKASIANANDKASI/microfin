package com.microfin.lms.web;

import com.microfin.lms.domain.Enums.Role;
import com.microfin.lms.domain.Enums.UserStatus;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.AuthService.UserView;
import com.microfin.lms.service.GeoPoint;
import com.microfin.lms.service.UserService;
import com.microfin.lms.service.UserService.CompanyView;
import com.microfin.lms.service.UserService.OfficerView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class UserController {

	static final String MANAGERS = "hasAnyRole('ADMIN', 'MANAGER')";

	public record CreateUserRequest(@NotBlank @Size(max = 120) String fullName, @NotBlank @Email @Size(max = 254) String email,
			@NotBlank @Pattern(regexp = Rules.PHONE, message = Rules.PHONE_MESSAGE) String phone,
			@NotBlank @Size(min = Rules.PASSWORD_MIN, max = Rules.PASSWORD_MAX) String password, @NotNull Role role) {
	}

	/** Every field is optional; only the ones sent are changed. */
	public record UpdateUserRequest(@Size(min = 1, max = 120) String fullName,
			@Pattern(regexp = Rules.PHONE, message = Rules.PHONE_MESSAGE) String phone, Role role, UserStatus status) {
	}

	public record OfficeRequest(@NotNull @Min(-90) @jakarta.validation.constraints.Max(90) Double lat,
			@NotNull @Min(-180) @jakarta.validation.constraints.Max(180) Double lng) {
	}

	public record UpdateCompanyRequest(@Size(min = 1, max = 120) String name, @Valid OfficeRequest office,
			@Min(0) Long dailyTarget) {
	}

	private final UserService users;

	public UserController(UserService users) {
		this.users = users;
	}

	@GetMapping("/users")
	@PreAuthorize(MANAGERS)
	public List<UserView> list() {
		return users.list(CurrentUser.get());
	}

	@PostMapping("/users")
	@PreAuthorize(MANAGERS)
	@ResponseStatus(HttpStatus.CREATED)
	public UserView create(@Valid @RequestBody CreateUserRequest request) {
		return users.create(CurrentUser.get(), request.fullName(), request.email(), request.phone(), request.password(),
				request.role());
	}

	@PatchMapping("/users/{id}")
	@PreAuthorize(MANAGERS)
	public UserView update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
		return users.update(CurrentUser.get(), id, request.fullName(), request.phone(), request.role(), request.status());
	}

	@GetMapping("/officers")
	public List<OfficerView> officers() {
		return users.officers(CurrentUser.get());
	}

	@GetMapping("/company")
	public CompanyView company() {
		return users.company(CurrentUser.get());
	}

	@PutMapping("/company")
	@PreAuthorize(MANAGERS)
	public CompanyView updateCompany(@Valid @RequestBody UpdateCompanyRequest request) {
		GeoPoint office = request.office() == null ? null : new GeoPoint(request.office().lat(), request.office().lng());
		return users.updateCompany(CurrentUser.get(), request.name(), office, request.dailyTarget());
	}
}
