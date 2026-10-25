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

public interface CustomerRepository extends JpaRepository<Customer, Long> {

	@EntityGraph(attributePaths = "line")
	List<Customer> findByCompanyIdOrderByIdDesc(Long companyId);

	@EntityGraph(attributePaths = { "line", "line.officer", "proofs" })
	Optional<Customer> findByCompanyIdAndCode(Long companyId, String code);

	boolean existsByCompanyIdAndPhone(Long companyId, String phone);

	boolean existsByCompanyIdAndPhoneAndIdNot(Long companyId, String phone, Long id);

	long countByCompanyId(Long companyId);
}
