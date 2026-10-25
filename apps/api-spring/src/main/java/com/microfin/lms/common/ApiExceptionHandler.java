package com.microfin.lms.common;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ApiExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

	public record FieldProblem(String field, String message) {
	}

	public record ErrorResponse(String code, String message, List<FieldProblem> errors) {
	}

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ErrorResponse> api(ApiException e) {
		return respond(e.getStatus(), e.getCode(), e.getMessage(), List.of());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException e) {
		List<FieldProblem> problems = e.getBindingResult().getFieldErrors().stream()
				.map(f -> new FieldProblem(f.getField(), f.getDefaultMessage()))
				.toList();
		return respond(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Some fields are invalid", problems);
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
	ResponseEntity<ErrorResponse> unreadable(Exception e) {
		return respond(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "The request could not be read", List.of());
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ResponseEntity<ErrorResponse> tooLarge(MaxUploadSizeExceededException e) {
		return respond(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "The file is too large", List.of());
	}

	/** Raised by @PreAuthorize; left to Spring Security's handler so it renders the usual 403. */
	@ExceptionHandler(AccessDeniedException.class)
	void denied(AccessDeniedException e) {
		throw e;
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ErrorResponse> unexpected(Exception e) throws Exception {
		// Let Spring render its own framework errors (405, 406, missing params, ...).
		if (e instanceof org.springframework.web.ErrorResponse) {
			throw e;
		}
		log.error("Unhandled error", e);
		return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Something went wrong on our side", List.of());
	}

	private static ResponseEntity<ErrorResponse> respond(HttpStatus status, String code, String message,
			List<FieldProblem> problems) {
		return ResponseEntity.status(status).body(new ErrorResponse(code, message, problems));
	}
}
