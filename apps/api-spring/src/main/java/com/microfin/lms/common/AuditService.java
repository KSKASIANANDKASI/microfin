package com.microfin.lms.common;

import com.microfin.lms.domain.AuditLog;
import com.microfin.lms.repo.AuditLogRepository;
import com.microfin.lms.security.CurrentUser;
import java.time.Clock;
import org.springframework.stereotype.Service;

/** Appends to the audit trail inside the caller's transaction, so a rolled-back action leaves no entry. */
@Service
public class AuditService {

	private final AuditLogRepository logs;
	private final Clock clock;

	public AuditService(AuditLogRepository logs, Clock clock) {
		this.logs = logs;
		this.clock = clock;
	}

	public void record(CurrentUser actor, String action, String entity, String entityCode, String detail) {
		record(actor.companyId(), actor.id(), action, entity, entityCode, detail);
	}

	public void record(Long companyId, Long actorId, String action, String entity, String entityCode, String detail) {
		AuditLog log = new AuditLog();
		log.setCompanyId(companyId);
		log.setActorId(actorId);
		log.setAction(action);
		log.setEntity(entity);
		log.setEntityCode(entityCode);
		log.setDetail(detail == null || detail.length() <= 1000 ? detail : detail.substring(0, 1000));
		log.setCreatedAt(clock.instant());
		logs.save(log);
	}
}
