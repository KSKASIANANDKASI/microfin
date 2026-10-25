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

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	List<Payment> findByLoanIdOrderBySeqDesc(Long loanId);

	Optional<Payment> findByCompanyIdAndClientOpId(Long companyId, String clientOpId);

	@Query("select p from Payment p where p.company.id = :companyId order by p.loan.id, p.seq")
	List<Payment> findAllForCompany(Long companyId);

	@EntityGraph(attributePaths = { "loan", "loan.customer", "loan.line", "loan.line.officer" })
	@Query("select p from Payment p where p.company.id = :companyId and p.paidOn between :from and :to order by p.paidOn, p.id")
	List<Payment> findInRange(Long companyId, LocalDate from, LocalDate to);
}
