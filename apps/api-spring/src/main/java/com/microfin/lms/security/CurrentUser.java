package com.microfin.lms.security;

import com.microfin.lms.domain.Enums.Role;
import org.springframework.security.core.context.SecurityContextHolder;

/** The signed-in staff member, as resolved from their token on this request. */
public record CurrentUser(Long id, Long companyId, String fullName, Role role) {

	public static CurrentUser get() {
		Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
		return (CurrentUser) principal;
	}
}
