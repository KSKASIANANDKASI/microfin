package com.microfin.lms.web;

import com.microfin.lms.domain.Enums.ApplicationStatus;
import com.microfin.lms.domain.Enums.LoanType;
import com.microfin.lms.domain.Enums.PaymentMode;
import com.microfin.lms.loan.LoanCalculator.Terms;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.ApplicationService;
import com.microfin.lms.service.ApplicationService.ApplicationInput;
import com.microfin.lms.service.ApplicationService.ApplicationView;
import com.microfin.lms.service.GeoPoint;
import com.microfin.lms.service.LineScope;
import com.microfin.lms.service.PaymentService;
import com.microfin.lms.service.PaymentService.PaymentInput;
import com.microfin.lms.service.PaymentService.SyncResult;
import com.microfin.lms.service.PortfolioService;
import com.microfin.lms.service.PortfolioService.LoanBookEntry;
import com.microfin.lms.service.PortfolioService.LoanDetail;
import com.microfin.lms.service.PortfolioService.RepaymentView;
import com.microfin.lms.service.PortfolioService.SheetItem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Applications, the loan book, receipts and today's collection sheet. */
@RestController
@RequestMapping("/api/v1")
public class LoanController {

	public record TermsRequest(@NotNull LoanType type, @Min(Rules.MIN_AMOUNT) @Max(Rules.MAX_AMOUNT) long principal,
			@NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax(Rules.MAX_RATE) @Digits(integer = 3, fraction = 3) BigDecimal annualRatePct,
			@Min(1) @Max(Rules.MAX_TENURE) int months, @PositiveOrZero long fee) {
	}

	/** emi may be left out to accept the calculated installment. */
	public record ApplicationRequest(@NotBlank String customerId, @NotNull LoanType type,
			@Min(Rules.MIN_AMOUNT) @Max(Rules.MAX_AMOUNT) long principal,
			@NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax(Rules.MAX_RATE) @Digits(integer = 3, fraction = 3) BigDecimal annualRatePct,
			@Min(1) @Max(Rules.MAX_TENURE) int months, @PositiveOrZero long fee, @Positive Long emi,
			@NotNull LocalDate disburseOn) {
	}

	public record ApproveRequest(@Size(max = 500) String note) {
	}

	public record RejectRequest(@NotBlank @Size(max = 500) String reason) {
	}

	public record GeoRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
			@NotNull @DecimalMin("-180") @DecimalMax("180") Double lng, @PositiveOrZero Double accuracy) {
	}

	public record PaymentRequest(@Min(1) int seq, @NotNull LocalDate paidOn, @NotNull PaymentMode mode, @Valid GeoRequest geo,
			@Size(max = 64) String clientOpId) {

		PaymentInput input(String loanId) {
			return new PaymentInput(loanId, seq, paidOn, mode, geo == null ? null : new GeoPoint(geo.lat(), geo.lng()),
					geo == null ? null : geo.accuracy(), clientOpId);
		}
	}

	public record SyncItem(@NotBlank @Size(max = 64) String clientOpId, @NotBlank String loanId, @Valid @NotNull PaymentRequest payment) {
	}

	public record SyncRequest(@NotEmpty @Size(max = 200) List<@Valid SyncItem> items) {
	}

	private final ApplicationService applications;
	private final PortfolioService portfolio;
	private final PaymentService payments;

	public LoanController(ApplicationService applications, PortfolioService portfolio, PaymentService payments) {
		this.applications = applications;
		this.portfolio = portfolio;
		this.payments = payments;
	}

	// ---- applications ----

	/** Prices a loan for the form's preview; saves nothing. */
	@PostMapping("/loans/price")
	public Terms price(@Valid @RequestBody TermsRequest request) {
		return applications.price(request.type(), request.principal(), request.annualRatePct(), request.months(), request.fee());
	}

	@GetMapping("/applications")
	public List<ApplicationView> applications(@RequestParam(required = false) ApplicationStatus status,
			@RequestParam(required = false) String customerId) {
		return applications.list(CurrentUser.get(), status, customerId);
	}

	@GetMapping("/applications/{id}")
	public ApplicationView application(@PathVariable String id) {
		return applications.get(CurrentUser.get(), id);
	}

	@PostMapping("/applications")
	@ResponseStatus(HttpStatus.CREATED)
	public ApplicationView submit(@Valid @RequestBody ApplicationRequest request) {
		return applications.submit(CurrentUser.get(), new ApplicationInput(request.customerId(), request.type(),
				request.principal(), request.annualRatePct(), request.months(), request.fee(), request.emi(), request.disburseOn()));
	}

	@PostMapping("/applications/{id}/approve")
	@PreAuthorize(UserController.MANAGERS)
	public ApplicationView approve(@PathVariable String id, @Valid @RequestBody(required = false) ApproveRequest request) {
		return applications.approve(CurrentUser.get(), id, request == null ? null : request.note());
	}

	@PostMapping("/applications/{id}/reject")
	@PreAuthorize(UserController.MANAGERS)
	public ApplicationView reject(@PathVariable String id, @Valid @RequestBody RejectRequest request) {
		return applications.reject(CurrentUser.get(), id, request.reason());
	}

	/** Books the approved application as a loan dated today and returns it with its schedule. */
	@PostMapping("/applications/{id}/disburse")
	@PreAuthorize(UserController.MANAGERS)
	public LoanDetail disburse(@PathVariable String id) {
		CurrentUser current = CurrentUser.get();
		return portfolio.detail(current, applications.disburse(current, id));
	}

	// ---- loan book ----

	/** state: all | active | overdue | closed. sort: newest | late | outstanding. */
	@GetMapping("/loans")
	public List<LoanBookEntry> loans(@RequestParam(required = false) String query,
			@RequestParam(defaultValue = "all") String state, @RequestParam(defaultValue = "all") String lineId,
			@RequestParam(required = false) String customerId, @RequestParam(defaultValue = "newest") String sort) {
		return portfolio.book(CurrentUser.get(), query, state, lineId, customerId, sort);
	}

	/** The loan with its customer, full schedule and receipts (newest first). */
	@GetMapping("/loans/{id}")
	public LoanDetail loan(@PathVariable String id) {
		return portfolio.detail(CurrentUser.get(), id);
	}

	// ---- collection ----

	/** Today's collection sheet, optionally for one line. */
	@GetMapping("/collection/sheet")
	public List<SheetItem> sheet(@RequestParam(required = false) String lineId) {
		return portfolio.sheet(LineScope.of(CurrentUser.get()), lineId);
	}

	/** Receipts the next installment of a loan. */
	@PostMapping("/loans/{id}/payments")
	@ResponseStatus(HttpStatus.CREATED)
	public RepaymentView pay(@PathVariable String id, @Valid @RequestBody PaymentRequest request) {
		return payments.record(CurrentUser.get(), request.input(id));
	}

	/**
	 * Posts receipts captured while offline. Safe to retry: an item whose clientOpId was already
	 * applied comes back as DUPLICATE with its original receipt.
	 */
	@PostMapping("/sync/payments")
	public Map<String, List<SyncResult>> sync(@Valid @RequestBody SyncRequest request) {
		List<PaymentInput> items = request.items().stream().map(item -> {
			PaymentRequest p = item.payment();
			return new PaymentInput(item.loanId(), p.seq(), p.paidOn(), p.mode(),
					p.geo() == null ? null : new GeoPoint(p.geo().lat(), p.geo().lng()), p.geo() == null ? null : p.geo().accuracy(),
					item.clientOpId());
		}).toList();
		return Map.of("results", payments.sync(CurrentUser.get(), items));
	}
}
