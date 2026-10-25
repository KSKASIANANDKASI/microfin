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

public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {

	@EntityGraph(attributePaths = { "customer", "line", "loan" })
	List<LoanApplication> findByCompanyIdOrderByIdDesc(Long companyId);

	@EntityGraph(attributePaths = { "customer", "line", "loan" })
	Optional<LoanApplication> findByCompanyIdAndCode(Long companyId, String code);

	/** Row-locked so two decisions on the same application cannot interleave. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select a from LoanApplication a where a.company.id = :companyId and a.code = :code")
	Optional<LoanApplication> findForUpdate(Long companyId, String code);

	boolean existsByCustomerIdAndStatusIn(Long customerId, Collection<ApplicationStatus> statuses);
}
