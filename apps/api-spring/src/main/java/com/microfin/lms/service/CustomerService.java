package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.AuditService;
import com.microfin.lms.common.CodeService;
import com.microfin.lms.domain.Customer;
import com.microfin.lms.domain.CustomerIdProof;
import com.microfin.lms.domain.Enums.ApplicationStatus;
import com.microfin.lms.domain.Enums.CustomerStatus;
import com.microfin.lms.domain.Enums.IdType;
import com.microfin.lms.domain.Enums.LoanStatus;
import com.microfin.lms.domain.Line;
import com.microfin.lms.domain.StoredFile;
import com.microfin.lms.repo.CompanyRepository;
import com.microfin.lms.repo.CustomerRepository;
import com.microfin.lms.repo.LineRepository;
import com.microfin.lms.repo.LoanApplicationRepository;
import com.microfin.lms.repo.LoanRepository;
import com.microfin.lms.security.CurrentUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CustomerService {

	public record GeoView(double lat, double lng, Double accuracy, Instant capturedAt) {
	}

	public record ProofImageView(String name, long size, String url) {
	}

	public record ProofView(IdType type, String number, ProofImageView front, ProofImageView back, Instant updatedAt) {
	}

	public record CustomerView(String id, String name, String phone, String altPhone, String parentName, String address,
			long requestedAmount, String lineId, String lineName, GeoView geo, List<ProofView> proofs,
			CustomerStatus status, Instant createdAt) {

		public static CustomerView of(Customer c) {
			GeoView geo = c.hasGeo()
					? new GeoView(c.getGeoLat().doubleValue(), c.getGeoLng().doubleValue(),
							c.getGeoAccuracy() == null ? null : c.getGeoAccuracy().doubleValue(), c.getGeoCapturedAt())
					: null;
			List<ProofView> proofs = c.getProofs().stream()
					.map(p -> new ProofView(p.getIdType(), p.getIdNumber(), image(c, p, p.getFront(), "front"),
							image(c, p, p.getBack(), "back"), p.getUpdatedAt()))
					.toList();
			return new CustomerView(c.getCode(), c.getName(), c.getPhone(), c.getAltPhone(), c.getParentName(),
					c.getAddress(), c.getRequestedAmount(), c.getLine().getCode(), c.getLine().getName(), geo, proofs,
					c.getStatus(), c.getCreatedAt());
		}

		private static ProofImageView image(Customer c, CustomerIdProof proof, StoredFile file, String side) {
			return file == null ? null
					: new ProofImageView(file.getOriginalName(), file.getSizeBytes(),
							"/api/v1/customers/" + c.getCode() + "/kyc/" + proof.getIdType() + "/" + side);
		}
	}

	public record CustomerInput(String name, String phone, String altPhone, String parentName, String address,
			long requestedAmount, String lineId) {
	}

	public record FileDownload(Resource resource, String contentType) {
	}

	/** Format checks only: that the ID exists and belongs to the customer is settled during KYC review. */
	private static final Map<IdType, Pattern> ID_RULES = Map.of(
			IdType.AADHAAR, Pattern.compile("[2-9]\\d{11}"),
			IdType.PAN, Pattern.compile("[A-Z]{5}\\d{4}[A-Z]"),
			IdType.VOTER_ID, Pattern.compile("[A-Z]{3}\\d{7}"),
			IdType.DRIVING_LICENSE, Pattern.compile("[A-Z]{2}\\d{13}"),
			IdType.PASSPORT, Pattern.compile("[A-Z]\\d{7}"));

	private final CustomerRepository customers;
	private final LineRepository lines;
	private final CompanyRepository companies;
	private final LoanRepository loans;
	private final LoanApplicationRepository applications;
	private final CodeService codes;
	private final FileStorage storage;
	private final AuditService audit;
	private final Clock clock;

	public CustomerService(CustomerRepository customers, LineRepository lines, CompanyRepository companies,
			LoanRepository loans, LoanApplicationRepository applications, CodeService codes, FileStorage storage,
			AuditService audit, Clock clock) {
		this.customers = customers;
		this.lines = lines;
		this.companies = companies;
		this.loans = loans;
		this.applications = applications;
		this.codes = codes;
		this.storage = storage;
		this.audit = audit;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<CustomerView> list(CurrentUser current, String query, String lineId, CustomerStatus status) {
		String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
		LineScope scope = LineScope.of(current);
		return customers.findByCompanyIdOrderByIdDesc(current.companyId()).stream()
				.filter(c -> scope.covers(c.getLine()))
				.filter(c -> status == null || c.getStatus() == status)
				.filter(c -> lineId == null || lineId.isBlank() || c.getLine().getCode().equals(lineId))
				.filter(c -> needle.isEmpty() || c.getName().toLowerCase(Locale.ROOT).contains(needle)
						|| c.getPhone().contains(needle) || c.getCode().toLowerCase(Locale.ROOT).contains(needle))
				.map(CustomerView::of)
				.toList();
	}

	@Transactional(readOnly = true)
	public CustomerView get(CurrentUser current, String code) {
		return CustomerView.of(find(current, code));
	}

	/** A customer on one of the caller's lines; any other answers 404. */
	Customer find(CurrentUser current, String code) {
		Customer customer = customers.findByCompanyIdAndCode(current.companyId(), code)
				.orElseThrow(() -> ApiException.notFound("Customer"));
		LineScope.of(current).require(customer.getLine(), "Customer");
		return customer;
	}

	@Transactional
	public CustomerView create(CurrentUser current, CustomerInput input) {
		if (customers.existsByCompanyIdAndPhone(current.companyId(), input.phone())) {
			throw ApiException.conflict("PHONE_TAKEN", "A customer with this mobile number already exists");
		}
		Instant now = clock.instant();
		Customer customer = new Customer();
		customer.setCompany(companies.getReferenceById(current.companyId()));
		customer.setStatus(CustomerStatus.PENDING);
		customer.setCreatedBy(current.id());
		customer.setCreatedAt(now);
		apply(current, customer, input, now);
		// Minted last, so a rejected request does not use up a number.
		customer.setCode(codes.next(current.companyId(), CodeService.Kind.CUSTOMER));
		customers.save(customer);
		audit.record(current, "CUSTOMER_CREATED", "CUSTOMER", customer.getCode(), null);
		return CustomerView.of(customer);
	}

	@Transactional
	public CustomerView update(CurrentUser current, String code, CustomerInput input) {
		Customer customer = find(current, code);
		if (!customer.getPhone().equals(input.phone())
				&& customers.existsByCompanyIdAndPhoneAndIdNot(current.companyId(), input.phone(), customer.getId())) {
			throw ApiException.conflict("PHONE_TAKEN", "A customer with this mobile number already exists");
		}
		if (!customer.getLine().getCode().equals(input.lineId()) && hasOpenBusiness(customer)) {
			throw ApiException.conflict("LINE_IN_USE",
					"This customer has a running loan or an open application on their current line");
		}
		apply(current, customer, input, clock.instant());
		audit.record(current, "CUSTOMER_UPDATED", "CUSTOMER", customer.getCode(), null);
		return CustomerView.of(customer);
	}

	private boolean hasOpenBusiness(Customer customer) {
		return loans.existsByCustomerIdAndStatus(customer.getId(), LoanStatus.ACTIVE) || applications
				.existsByCustomerIdAndStatusIn(customer.getId(), EnumSet.of(ApplicationStatus.PENDING, ApplicationStatus.APPROVED));
	}

	private void apply(CurrentUser current, Customer customer, CustomerInput input, Instant now) {
		if (input.altPhone() != null && input.altPhone().equals(input.phone())) {
			throw ApiException.badRequest("ALT_PHONE_SAME", "The alternate number must differ from the mobile number");
		}
		// An officer onboards only onto their own lines.
		Line line = lines.findByCompanyIdAndCode(current.companyId(), input.lineId())
				.filter(LineScope.of(current)::covers)
				.orElseThrow(() -> ApiException.badRequest("UNKNOWN_LINE", "Choose a collection line"));
		customer.setLine(line);
		customer.setName(input.name().trim());
		customer.setPhone(input.phone());
		customer.setAltPhone(input.altPhone() == null || input.altPhone().isBlank() ? null : input.altPhone());
		customer.setParentName(input.parentName().trim());
		customer.setAddress(input.address().trim());
		customer.setRequestedAmount(input.requestedAmount());
		customer.setUpdatedAt(now);
	}

	/** Records or clears the doorstep pin. Collection routes are drawn from these. */
	@Transactional
	public CustomerView setGeo(CurrentUser current, String code, GeoPoint point, Double accuracy) {
		Customer customer = find(current, code);
		Instant now = clock.instant();
		if (point == null) {
			customer.setGeoLat(null);
			customer.setGeoLng(null);
			customer.setGeoAccuracy(null);
			customer.setGeoCapturedAt(null);
		} else {
			customer.setGeoLat(BigDecimal.valueOf(point.lat()).setScale(6, RoundingMode.HALF_UP));
			customer.setGeoLng(BigDecimal.valueOf(point.lng()).setScale(6, RoundingMode.HALF_UP));
			customer.setGeoAccuracy(accuracy == null ? null : BigDecimal.valueOf(accuracy).setScale(2, RoundingMode.HALF_UP));
			customer.setGeoCapturedAt(now);
		}
		customer.setUpdatedAt(now);
		audit.record(current, point == null ? "GEO_CLEARED" : "GEO_CAPTURED", "CUSTOMER", customer.getCode(), null);
		return CustomerView.of(customer);
	}

	/**
	 * Adds an identity proof, or replaces the customer's proof of the same type. Images are
	 * optional and only replace the side that is sent; a PAN card has nothing on its reverse, so
	 * any back image is dropped for it.
	 */
	@Transactional
	public CustomerView saveProof(CurrentUser current, String code, IdType type, String rawNumber, MultipartFile front,
			MultipartFile back) {
		Customer customer = find(current, code);
		String number = rawNumber.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
		if (!ID_RULES.get(type).matcher(number).matches()) {
			throw ApiException.badRequest("ID_FORMAT", "That is not a valid " + type.name().replace('_', ' ') + " number");
		}
		Instant now = clock.instant();
		CustomerIdProof proof = customer.proof(type).orElseGet(() -> {
			CustomerIdProof fresh = new CustomerIdProof();
			fresh.setCustomer(customer);
			fresh.setIdType(type);
			fresh.setCreatedBy(current.id());
			fresh.setCreatedAt(now);
			customer.getProofs().add(fresh);
			return fresh;
		});
		proof.setIdNumber(number);
		proof.setUpdatedAt(now);
		if (present(front)) {
			StoredFile old = proof.getFront();
			proof.setFront(storage.saveImage(customer.getCompany(), current.id(), front));
			discard(old);
		}
		if (type == IdType.PAN) {
			StoredFile old = proof.getBack();
			proof.setBack(null);
			discard(old);
		} else if (present(back)) {
			StoredFile old = proof.getBack();
			proof.setBack(storage.saveImage(customer.getCompany(), current.id(), back));
			discard(old);
		}
		customer.setUpdatedAt(now);
		// The ID number never goes into the audit trail.
		audit.record(current, "KYC_SAVED", "CUSTOMER", customer.getCode(), type.name());
		return CustomerView.of(customer);
	}

	/** Removes one identity proof and its images. */
	@Transactional
	public CustomerView removeProof(CurrentUser current, String code, IdType type) {
		Customer customer = find(current, code);
		CustomerIdProof proof = customer.proof(type).orElseThrow(() -> ApiException.notFound("Identity proof"));
		customer.getProofs().remove(proof);
		customer.setUpdatedAt(clock.instant());
		discard(proof.getFront());
		discard(proof.getBack());
		audit.record(current, "KYC_REMOVED", "CUSTOMER", customer.getCode(), type.name());
		return CustomerView.of(customer);
	}

	@Transactional(readOnly = true)
	public FileDownload proofImage(CurrentUser current, String code, IdType type, String side) {
		CustomerIdProof proof = find(current, code).proof(type).orElseThrow(() -> ApiException.notFound("Image"));
		StoredFile file = switch (side) {
			case "front" -> proof.getFront();
			case "back" -> proof.getBack();
			default -> null;
		};
		if (file == null) {
			throw ApiException.notFound("Image");
		}
		return new FileDownload(storage.open(file), file.getContentType());
	}

	private static boolean present(MultipartFile file) {
		return file != null && !file.isEmpty();
	}

	private void discard(StoredFile old) {
		if (old != null) {
			// Flush first so no proof row still points at the file when it is deleted.
			customers.flush();
			storage.delete(old);
		}
	}
}
