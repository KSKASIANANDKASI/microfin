package com.microfin.lms.web;

import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.AuthService;
import com.microfin.lms.service.AuthService.Session;
import com.microfin.lms.service.AuthService.UserView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

	public record SignUpRequest(@NotBlank @Size(max = 120) String companyName, @NotBlank @Size(max = 120) String fullName,
			@NotBlank @Email @Size(max = 254) String email,
			@NotBlank @Pattern(regexp = Rules.PHONE, message = Rules.PHONE_MESSAGE) String phone,
			@NotBlank @Size(min = Rules.PASSWORD_MIN, max = Rules.PASSWORD_MAX) String password) {
	}

	public record SignInRequest(@NotBlank String email, @NotBlank String password, boolean remember) {
	}

	public record ForgotRequest(@NotBlank @Email String email) {
	}

	public record ResetRequest(@NotBlank String token,
			@NotBlank @Size(min = Rules.PASSWORD_MIN, max = Rules.PASSWORD_MAX) String password) {
	}

	public record ChangePasswordRequest(@NotBlank String currentPassword,
			@NotBlank @Size(min = Rules.PASSWORD_MIN, max = Rules.PASSWORD_MAX) String newPassword) {
	}

	private final AuthService auth;

	public AuthController(AuthService auth) {
		this.auth = auth;
	}

	@PostMapping("/sign-up")
	@ResponseStatus(HttpStatus.CREATED)
	public Session signUp(@Valid @RequestBody SignUpRequest request) {
		return auth.signUp(request.companyName(), request.fullName(), request.email(), request.phone(), request.password());
	}

	@PostMapping("/sign-in")
	public Session signIn(@Valid @RequestBody SignInRequest request) {
		return auth.signIn(request.email(), request.password(), request.remember());
	}

	@GetMapping("/me")
	public UserView me() {
		return auth.me(CurrentUser.get());
	}

	/** Always succeeds, whether or not the email has an account. */
	@PostMapping("/forgot-password")
	public Map<String, Object> forgotPassword(@Valid @RequestBody ForgotRequest request) {
		return auth.forgotPassword(request.email())
				.<Map<String, Object>>map(token -> Map.of("sent", true, "devResetToken", token))
				.orElseGet(() -> Map.of("sent", true));
	}

	@PostMapping("/reset-password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resetPassword(@Valid @RequestBody ResetRequest request) {
		auth.resetPassword(request.token(), request.password());
	}

	@PostMapping("/change-password")
	public Session changePassword(@Valid @RequestBody ChangePasswordRequest request) {
		return auth.changePassword(CurrentUser.get(), request.currentPassword(), request.newPassword());
	}
}
