package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.common.AuditService;
import com.microfin.lms.common.Today;
import com.microfin.lms.domain.Enums.LoanStatus;
import com.microfin.lms.domain.Enums.PaymentMode;
import com.microfin.lms.domain.Installment;
import com.microfin.lms.domain.Loan;
import com.microfin.lms.domain.Payment;
import com.microfin.lms.repo.InstallmentRepository;
import com.microfin.lms.repo.LoanRepository;
import com.microfin.lms.repo.PaymentRepository;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.PortfolioService.RepaymentView;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/** Receipting installments, one at a time or as a batch synced from a device that was offline. */
@Service
public class PaymentService {

	public record PaymentInput(String loanId, int seq, LocalDate paidOn, PaymentMode mode, GeoPoint geo, Double accuracy,
			/** Minted on the device; a repeat with the same key returns the first receipt instead of a second one. */
			String clientOpId) {
	}

	/** status: APPLIED | DUPLICATE | REJECTED. */
	public record SyncResult(String clientOpId, String status, RepaymentView receipt, String code, String error) {
	}

	private final LoanRepository loans;
	private final InstallmentRepository installments;
	private final PaymentRepository payments;
	private final AuditService audit;
	private final Today today;
	private final TransactionTemplate perItem;

	public PaymentService(LoanRepository loans, InstallmentRepository installments, PaymentRepository payments,
			AuditService audit, Today today, PlatformTransactionManager transactionManager) {
		this.loans = loans;
		this.installments = installments;
		this.payments = payments;
		this.audit = audit;
		this.today = today;
		this.perItem = new TransactionTemplate(transactionManager);
		this.perItem.setPropagationBehavior(Propagation.REQUIRES_NEW.value());
	}

	/**
	 * Receipts one installment in full. Installments are collected oldest first, and only once
	 * they have fallen due; there are no part payments.
	 */
	@Transactional
	public RepaymentView record(CurrentUser current, PaymentInput input) {
		if (input.clientOpId() != null) {
			Payment earlier = payments.findByCompanyIdAndClientOpId(current.companyId(), input.clientOpId()).orElse(null);
			if (earlier != null) {
				LineScope.of(current).require(earlier.getLoan().getLine(), "Loan");
				return RepaymentView.of(earlier);
			}
		}
		// Locking the loan serialises receipts on it, so two officers cannot both take installment 4.
		Loan loan = loans.findForUpdate(current.companyId(), input.loanId()).orElseThrow(() -> ApiException.notFound("Loan"));
		LineScope.of(current).require(loan.getLine(), "Loan");
		List<Installment> schedule = installments.findByLoanIdOrderBySeqAsc(loan.getId());
		Installment next = schedule.stream().filter(i -> !i.isPaid()).findFirst()
				.orElseThrow(() -> ApiException.conflict("LOAN_CLOSED", loan.getLoanNo() + " is already fully repaid"));
		if (next.getSeq() != input.seq()) {
			throw ApiException.conflict("WRONG_INSTALLMENT", input.seq() < next.getSeq()
					? "Installment " + input.seq() + " of " + loan.getLoanNo() + " has already been collected"
					: "Installment " + next.getSeq() + " of " + loan.getLoanNo() + " must be collected first");
		}
		LocalDate now = today.date();
		if (input.paidOn().isAfter(now)) {
			throw ApiException.badRequest("DATE_AHEAD", "The payment date cannot be in the future");
		}
		if (input.paidOn().isBefore(next.getDueOn())) {
			throw ApiException.badRequest("DATE_BEFORE_DUE", "This installment is not due until " + next.getDueOn());
		}

		next.setPaidOn(input.paidOn());

		Payment payment = new Payment();
		payment.setCompany(loan.getCompany());
		payment.setLoan(loan);
		payment.setInstallment(next);
		payment.setSeq(next.getSeq());
		payment.setReceiptNo(receiptNo(loan.getLoanNo(), next.getSeq()));
		payment.setAmount(next.getAmount());
		payment.setPaidOn(input.paidOn());
		payment.setDaysLate((int) ChronoUnit.DAYS.between(next.getDueOn(), input.paidOn()));
		payment.setMode(input.mode());
		payment.setPostedAt(today.instant());
		if (input.geo() != null) {
			payment.setGeoLat(BigDecimal.valueOf(input.geo().lat()).setScale(6, RoundingMode.HALF_UP));
			payment.setGeoLng(BigDecimal.valueOf(input.geo().lng()).setScale(6, RoundingMode.HALF_UP));
			payment.setGeoAccuracy(input.accuracy() == null ? null : BigDecimal.valueOf(input.accuracy()).setScale(2, RoundingMode.HALF_UP));
		}
		payment.setCollectedById(current.id());
		payment.setClientOpId(input.clientOpId());
		payments.save(payment);

		if (next.getSeq() == schedule.get(schedule.size() - 1).getSeq()) {
			loan.setStatus(LoanStatus.CLOSED);
			loan.setClosedOn(input.paidOn());
		}
		audit.record(current, "PAYMENT_RECORDED", "LOAN", loan.getLoanNo(),
				payment.getReceiptNo() + " ₹" + payment.getAmount() + " " + payment.getMode());
		return RepaymentView.of(payment);
	}

	/** Receipt numbers are per loan and installment, so a re-sync can never mint a second one. */
	static String receiptNo(String loanNo, int seq) {
		return String.format("RC-%s-%02d", loanNo.replaceFirst("^LN-", ""), seq);
	}

	/**
	 * Posts receipts captured offline. Each item commits or fails on its own, in the order sent,
	 * so one bad receipt never blocks the rest of the batch.
	 */
	public List<SyncResult> sync(CurrentUser current, List<PaymentInput> items) {
		List<SyncResult> results = new ArrayList<>();
		for (PaymentInput item : items) {
			try {
				boolean seen = payments.findByCompanyIdAndClientOpId(current.companyId(), item.clientOpId()).isPresent();
				RepaymentView receipt = perItem.execute(status -> record(current, item));
				results.add(new SyncResult(item.clientOpId(), seen ? "DUPLICATE" : "APPLIED", receipt, null, null));
			} catch (ApiException e) {
				results.add(new SyncResult(item.clientOpId(), "REJECTED", null, e.getCode(), e.getMessage()));
			}
		}
		return results;
	}
}
