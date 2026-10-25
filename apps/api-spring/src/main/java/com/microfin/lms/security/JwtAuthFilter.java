package com.microfin.lms.security;

import com.microfin.lms.domain.Enums.UserStatus;
import com.microfin.lms.domain.User;
import com.microfin.lms.repo.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

	private final JwtService jwt;
	private final UserRepository users;

	public JwtAuthFilter(JwtService jwt, UserRepository users) {
		this.jwt = jwt;
		this.users = users;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
			jwt.verify(header.substring(7).trim()).ifPresent(this::authenticate);
		}
		chain.doFilter(request, response);
	}

	/**
	 * The account is read on every request, so suspending a user or changing their role or
	 * password takes effect at once rather than when their token expires.
	 */
	private void authenticate(JwtService.Verified token) {
		User user = users.findById(token.userId()).orElse(null);
		if (user == null || user.getStatus() != UserStatus.ACTIVE) {
			return;
		}
		if (token.tokenVersion() != user.getTokenVersion()) {
			return;
		}
		CurrentUser principal = new CurrentUser(user.getId(), user.getCompany().getId(), user.getFullName(), user.getRole());
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null,
				List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
	}
}
