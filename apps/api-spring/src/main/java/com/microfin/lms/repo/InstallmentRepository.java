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

public interface InstallmentRepository extends JpaRepository<Installment, Long> {

	List<Installment> findByLoanIdOrderBySeqAsc(Long loanId);

	@Query("select i from Installment i where i.loan.company.id = :companyId order by i.loan.id, i.seq")
	List<Installment> findAllForCompany(Long companyId);
}
