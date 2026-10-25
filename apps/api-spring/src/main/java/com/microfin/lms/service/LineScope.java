package com.microfin.lms.service;

import com.microfin.lms.common.ApiException;
import com.microfin.lms.domain.Enums.Role;
import com.microfin.lms.domain.Line;
import com.microfin.lms.security.CurrentUser;

/**
 * Which lines a request may see. Managers and admins see every line of their company; a loan
 * officer sees only the lines assigned to them, and with them only those lines' customers, loans,
 * applications and receipts. Anything outside the scope answers 404, as if it did not exist.
 */
public record LineScope(Long companyId, Long officerId) {

	public static LineScope of(CurrentUser current) {
		return new LineScope(current.companyId(), current.role() == Role.LOAN_OFFICER ? current.id() : null);
	}

	/** The whole company, for manager-only work such as reports. */
	public static LineScope company(Long companyId) {
		return new LineScope(companyId, null);
	}

	public boolean covers(Line line) {
		// getId() on a lazy officer reads the foreign key without loading the user.
		return officerId == null || (line.getOfficer() != null && officerId.equals(line.getOfficer().getId()));
	}

	/** Passes the line through, or answers 404 for one outside the scope. */
	public Line require(Line line, String what) {
		if (!covers(line)) {
			throw ApiException.notFound(what);
		}
		return line;
	}
}
