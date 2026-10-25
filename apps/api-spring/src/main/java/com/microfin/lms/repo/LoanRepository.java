package com.microfin.lms.repo;

import com.microfin.lms.domain.*;
import com.microfin.lms.domain.Enums.*;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface LoanRepository extends JpaRepository<Loan, Long> {

	@EntityGraph(attributePaths = { "customer", "line", "line.officer" })
	List<Loan> findByCompanyIdOrderByDisbursedOnDescIdDesc(Long companyId);

	@EntityGraph(attributePaths = { "customer", "line", "line.officer" })
	Optional<Loan> findByCompanyIdAndLoanNo(Long companyId, String loanNo);

	boolean existsByCustomerIdAndStatus(Long customerId, LoanStatus status);

	/** Row-locked so two receipts on the same loan are applied one after the other. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select l from Loan l where l.company.id = :companyId and l.loanNo = :loanNo")
	Optional<Loan> findForUpdate(Long companyId, String loanNo);
}
