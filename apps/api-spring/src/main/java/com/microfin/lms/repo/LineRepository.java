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

public interface LineRepository extends JpaRepository<Line, Long> {

	@EntityGraph(attributePaths = "officer")
	List<Line> findByCompanyIdOrderByCodeAsc(Long companyId);

	@EntityGraph(attributePaths = "officer")
	Optional<Line> findByCompanyIdAndCode(Long companyId, String code);

	boolean existsByCompanyIdAndNameIgnoreCase(Long companyId, String name);
}
