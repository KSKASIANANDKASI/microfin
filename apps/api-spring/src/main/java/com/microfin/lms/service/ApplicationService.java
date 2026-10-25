package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.AuditService;
import com.microfin.lms.common.CodeService;
import com.microfin.lms.common.Today;
import com.microfin.lms.domain.Customer;
import com.microfin.lms.domain.Enums.ApplicationStatus;
import com.microfin.lms.domain.Enums.CustomerStatus;
import com.microfin.lms.domain.Enums.LoanStatus;
import com.microfin.lms.domain.Enums.LoanType;
import com.microfin.lms.domain.Installment;
import com.microfin.lms.domain.Loan;
import com.microfin.lms.domain.LoanApplication;
import com.microfin.lms.loan.LoanCalculator;
import com.microfin.lms.loan.LoanCalculator.ScheduleRow;
import com.microfin.lms.loan.LoanCalculator.Terms;
import com.microfin.lms.repo.InstallmentRepository;
import com.microfin.lms.repo.LoanApplicationRepository;
import com.microfin.lms.repo.LoanRepository;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.web.Rules;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The road to disbursal: an officer submits an application, a manager approves or rejects it,
 * and only an approved one can be disbursed, at which point it becomes a loan with a schedule.
 */
@Service
public class ApplicationService {

	public record ApplicationView(String id, String customerId, String customerName, String lineId, LoanType type,
			long principal, BigDecimal annualRatePct, int months, long fee, long emi, LocalDate disburseOn,
			LocalDate submittedOn, String submittedBy, ApplicationStatus status, String note, LocalDate decidedOn,
			String loanId,
			/** Why it cannot be approved yet, if anything stops it: currently only "noProof". */
			String approvalBlocker, Terms terms) {

		static ApplicationView of(LoanApplication a) {
			Customer c = a.getCustomer();
			String blocker = a.getStatus() == ApplicationStatus.PENDING && !c.hasProof() ? "noProof" : null;
			return new ApplicationView(a.getCode(), c.getCode(), c.getName(), a.getLine().getCode(), a.getType(),
					a.getPrincipal(), a.getAnnualRatePct(), a.getMonths(), a.getFee(), a.getEmi(), a.getDisburseOn(),
					a.getSubmittedOn(), a.getSubmittedBy(), a.getStatus(), a.getNote(), a.getDecidedOn(),
					a.getLoan() == null ? null : a.getLoan().getLoanNo(), blocker,
					LoanCalculator.compute(a.getPrincipal(), a.getAnnualRatePct(), a.getMonths(), a.getFee(), a.getType()));
		}
	}

	public record ApplicationInput(String customerId, LoanType type, long principal, BigDecimal annualRatePct, int months,
			long fee, Long emi, LocalDate disburseOn) {
	}

	private final LoanApplicationRepository applications;
	private final LoanRepository loans;
	private final InstallmentRepository installments;
	private final CustomerService customers;
	private final CodeService codes;
	private final AuditService audit;
	private final Today today;

	public ApplicationService(LoanApplicationRepository applications, LoanRepository loans,
			InstallmentRepository installments, CustomerService customers, CodeService codes, AuditService audit,
			Today today) {
		this.applications = applications;
		this.loans = loans;
		this.installments = installments;
		this.customers = customers;
		this.codes = codes;
		this.audit = audit;
		this.today = today;
	}

	@Transactional(readOnly = true)
	public List<ApplicationView> list(CurrentUser current, ApplicationStatus status, String customerId) {
		LineScope scope = LineScope.of(current);
		return applications.findByCompanyIdOrderByIdDesc(current.companyId()).stream()
				.filter(a -> scope.covers(a.getLine()))
				.filter(a -> status == null || a.getStatus() == status)
				.filter(a -> customerId == null || a.getCustomer().getCode().equals(customerId))
				.map(ApplicationView::of)
				.toList();
	}

	@Transactional(readOnly = true)
	public ApplicationView get(CurrentUser current, String code) {
		return applications.findByCompanyIdAndCode(current.companyId(), code)
				.filter(a -> LineScope.of(current).covers(a.getLine()))
				.map(ApplicationView::of)
				.orElseThrow(() -> ApiException.notFound("Application"));
	}

	/** Prices a loan without saving anything, for the form's live preview. */
	public Terms price(LoanType type, long principal, BigDecimal annualRatePct, int months, long fee) {
		return checkedTerms(type, principal, annualRatePct, months, fee);
	}

	@Transactional
	public ApplicationView submit(CurrentUser current, ApplicationInput input) {
		Customer customer = customers.find(current, input.customerId());
		if (applications.existsByCustomerIdAndStatusIn(customer.getId(),
				EnumSet.of(ApplicationStatus.PENDING, ApplicationStatus.APPROVED))) {
			throw ApiException.conflict("APPLICATION_OPEN", customer.getName() + " already has an application in progress");
		}
		LocalDate now = today.date();
		if (input.disburseOn().isAfter(now.plusDays(Rules.MAX_DAYS_AHEAD))) {
			throw ApiException.badRequest("DATE_TOO_FAR",
					"The disbursal date can be at most " + Rules.MAX_DAYS_AHEAD + " days ahead");
		}
		Terms terms = checkedTerms(input.type(), input.principal(), input.annualRatePct(), input.months(), input.fee());
		long emi = input.emi() == null ? terms.emi() : input.emi();
		// The agreed installment may be rounded up from the calculated one, never down: the
		// tenure has to recover the whole amount.
		if (emi * input.months() < terms.totalPayable()) {
			throw ApiException.badRequest("EMI_SHORT", input.months() + " installments of ₹" + emi + " fall ₹"
					+ (terms.totalPayable() - emi * input.months()) + " short of the amount to recover");
		}

		LoanApplication application = new LoanApplication();
		application.setCompany(customer.getCompany());
		application.setCode(codes.next(current.companyId(), CodeService.Kind.APPLICATION));
		application.setCustomer(customer);
		application.setLine(customer.getLine());
		application.setType(input.type());
		application.setPrincipal(input.principal());
		application.setAnnualRatePct(input.annualRatePct());
		application.setMonths(input.months());
		application.setFee(input.fee());
		application.setEmi(emi);
		application.setDisburseOn(input.disburseOn());
		application.setSubmittedOn(now);
		application.setSubmittedById(current.id());
		application.setSubmittedBy(customer.getLine().officerName());
		application.setStatus(ApplicationStatus.PENDING);
		application.setCreatedAt(today.instant());
		applications.save(application);
		audit.record(current, "APPLICATION_SUBMITTED", "APPLICATION", application.getCode(), "₹" + input.principal());
		return ApplicationView.of(application);
	}

	private static Terms checkedTerms(LoanType type, long principal, BigDecimal annualRatePct, int months, long fee) {
		// The fee comes out of the disbursal; it cannot swallow the loan.
		if (fee * 10 > principal) {
			throw ApiException.badRequest("FEE_HIGH", "The fee cannot be more than a tenth of the loan amount");
		}
		Terms terms = LoanCalculator.compute(principal, annualRatePct, months, fee, type);
		if (terms.netDisbursal() <= 0) {
			throw ApiException.badRequest("NOTHING_TO_DISBURSE",
					"Interest and fee taken up front leave nothing to hand over. Shorten the tenure or lower the rate.");
		}
		return terms;
	}

	@Transactional
	public ApplicationView approve(CurrentUser current, String code, String note) {
		LoanApplication application = pending(current, code);
		Customer customer = application.getCustomer();
		if (!customer.hasProof()) {
			throw ApiException.conflict("NO_PROOF", customer.getName() + " has no identity proof on file");
		}
		decide(current, application, ApplicationStatus.APPROVED, blankToNull(note));
		if (customer.getStatus() == CustomerStatus.PENDING) {
			customer.setStatus(CustomerStatus.APPROVED);
		}
		audit.record(current, "APPLICATION_APPROVED", "APPLICATION", code, application.getNote());
		return ApplicationView.of(application);
	}

	@Transactional
	public ApplicationView reject(CurrentUser current, String code, String reason) {
		LoanApplication application = pending(current, code);
		decide(current, application, ApplicationStatus.REJECTED, reason.trim());
		audit.record(current, "APPLICATION_REJECTED", "APPLICATION", code, application.getNote());
		return ApplicationView.of(application);
	}

	private LoanApplication pending(CurrentUser current, String code) {
		LoanApplication application = applications.findForUpdate(current.companyId(), code)
				.orElseThrow(() -> ApiException.notFound("Application"));
		if (application.getStatus() != ApplicationStatus.PENDING) {
			throw ApiException.conflict("NOT_PENDING", code + " is not awaiting approval");
		}
		return application;
	}

	private void decide(CurrentUser current, LoanApplication application, ApplicationStatus status, String note) {
		application.setStatus(status);
		application.setNote(note);
		application.setDecidedOn(today.date());
		application.setDecidedById(current.id());
	}

	/**
	 * Hands over the cash: books the approved application as a live loan dated today, so its
	 * schedule starts from the day the money actually left, and returns the new loan number.
	 */
	@Transactional
	public String disburse(CurrentUser current, String code) {
		LoanApplication application = applications.findForUpdate(current.companyId(), code)
				.orElseThrow(() -> ApiException.notFound("Application"));
		if (application.getStatus() != ApplicationStatus.APPROVED) {
			throw ApiException.conflict("NOT_APPROVED", code + " is not approved");
		}
		Loan loan = book(codes.next(current.companyId(), CodeService.Kind.LOAN), current.id(), application.getCustomer(), application.getType(),
				application.getPrincipal(), application.getAnnualRatePct(), application.getMonths(), application.getFee(),
				application.getEmi(), today.date());
		application.setStatus(ApplicationStatus.DISBURSED);
		application.setLoan(loan);
		application.getCustomer().setStatus(CustomerStatus.ACTIVE);
		audit.record(current, "LOAN_DISBURSED", "LOAN", loan.getLoanNo(), code + " ₹" + loan.getNetDisbursal() + " handed over");
		return loan.getLoanNo();
	}

	/** Creates the loan row and writes its whole schedule. */
	Loan book(String loanNo, Long disbursedBy, Customer customer, LoanType type, long principal, BigDecimal annualRatePct,
			int months, long fee, long emi, LocalDate disbursedOn) {
		Terms terms = LoanCalculator.compute(principal, annualRatePct, months, fee, type);
		Loan loan = new Loan();
		loan.setCompany(customer.getCompany());
		loan.setLoanNo(loanNo);
		loan.setCustomer(customer);
		loan.setLine(customer.getLine());
		loan.setType(type);
		loan.setPrincipal(principal);
		loan.setAnnualRatePct(annualRatePct);
		loan.setMonths(months);
		loan.setFee(fee);
		loan.setEmi(emi);
		loan.setTotalInterest(terms.totalInterest());
		loan.setTotalPayable(terms.totalPayable());
		loan.setNetDisbursal(terms.netDisbursal());
		loan.setDisbursedOn(disbursedOn);
		loan.setDisbursedBy(disbursedBy);
		loan.setStatus(LoanStatus.ACTIVE);
		loan.setCreatedAt(today.instant());
		loans.save(loan);

		for (ScheduleRow row : LoanCalculator.schedule(disbursedOn, months, emi, terms.totalPayable())) {
			Installment installment = new Installment();
			installment.setLoan(loan);
			installment.setSeq(row.seq());
			installment.setDueOn(row.dueOn());
			installment.setAmount(row.amount());
			installment.setBalanceAfter(row.balanceAfter());
			installments.save(installment);
		}
		return loan;
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}
