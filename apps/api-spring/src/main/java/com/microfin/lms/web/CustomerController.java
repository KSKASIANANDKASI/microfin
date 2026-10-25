package com.microfin.lms.web;

import com.microfin.lms.domain.Enums.CustomerStatus;
import com.microfin.lms.domain.Enums.IdType;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.CustomerService;
import com.microfin.lms.service.CustomerService.CustomerInput;
import com.microfin.lms.service.CustomerService.CustomerView;
import com.microfin.lms.service.CustomerService.FileDownload;
import com.microfin.lms.service.GeoPoint;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

	public record CustomerRequest(@NotBlank @Size(max = 120) String name,
			@NotBlank @Pattern(regexp = Rules.PHONE, message = Rules.PHONE_MESSAGE) String phone,
			@Pattern(regexp = "|" + Rules.PHONE, message = Rules.PHONE_MESSAGE) String altPhone,
			@NotBlank @Size(max = 120) String parentName, @NotBlank @Size(max = 300) String address,
			@Min(Rules.MIN_AMOUNT) @Max(Rules.MAX_AMOUNT) long requestedAmount, @NotBlank String lineId) {

		CustomerInput input() {
			return new CustomerInput(name, phone, altPhone, parentName, address, requestedAmount, lineId);
		}
	}

	public record GeoRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
			@NotNull @DecimalMin("-180") @DecimalMax("180") Double lng, @PositiveOrZero Double accuracy) {
	}

	private final CustomerService customers;

	public CustomerController(CustomerService customers) {
		this.customers = customers;
	}

	/** Newest first. query matches name, phone or customer code. */
	@GetMapping
	public List<CustomerView> list(@RequestParam(required = false) String query,
			@RequestParam(required = false) String lineId, @RequestParam(required = false) CustomerStatus status) {
		return customers.list(CurrentUser.get(), query, lineId, status);
	}

	@GetMapping("/{id}")
	public CustomerView get(@PathVariable String id) {
		return customers.get(CurrentUser.get(), id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public CustomerView create(@Valid @RequestBody CustomerRequest request) {
		return customers.create(CurrentUser.get(), request.input());
	}

	@PutMapping("/{id}")
	public CustomerView update(@PathVariable String id, @Valid @RequestBody CustomerRequest request) {
		return customers.update(CurrentUser.get(), id, request.input());
	}

	/** Records the doorstep pin. */
	@PutMapping("/{id}/geo")
	public CustomerView setGeo(@PathVariable String id, @Valid @RequestBody GeoRequest request) {
		return customers.setGeo(CurrentUser.get(), id, new GeoPoint(request.lat(), request.lng()), request.accuracy());
	}

	@DeleteMapping("/{id}/geo")
	public CustomerView clearGeo(@PathVariable String id) {
		return customers.setGeo(CurrentUser.get(), id, null, null);
	}

	/**
	 * Adds an identity proof, or replaces the one of the same type, as multipart form data:
	 * {@code type}, {@code number} and optional {@code front} / {@code back} photos (JPEG, PNG or
	 * WebP, up to 5 MB each).
	 */
	@PutMapping(path = "/{id}/kyc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public CustomerView saveProof(@PathVariable String id, @RequestParam IdType type, @RequestParam String number,
			@RequestPart(required = false) MultipartFile front, @RequestPart(required = false) MultipartFile back) {
		return customers.saveProof(CurrentUser.get(), id, type, number, front, back);
	}

	@DeleteMapping("/{id}/kyc/{type}")
	public CustomerView removeProof(@PathVariable String id, @PathVariable IdType type) {
		return customers.removeProof(CurrentUser.get(), id, type);
	}

	/** side is {@code front} or {@code back}. Needs the Authorization header like every other route. */
	@GetMapping("/{id}/kyc/{type}/{side}")
	public ResponseEntity<Resource> proofImage(@PathVariable String id, @PathVariable IdType type,
			@PathVariable String side) {
		FileDownload file = customers.proofImage(CurrentUser.get(), id, type, side);
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(file.contentType()))
				.cacheControl(CacheControl.noStore())
				.header("X-Content-Type-Options", "nosniff")
				.body(file.resource());
	}
}
