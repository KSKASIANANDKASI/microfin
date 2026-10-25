package com.microfin.lms.web;

import com.microfin.lms.domain.Enums.Frequency;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.LineScope;
import com.microfin.lms.service.LineService;
import com.microfin.lms.service.LineService.LineInput;
import com.microfin.lms.service.PortfolioService;
import com.microfin.lms.service.PortfolioService.LineRoute;
import com.microfin.lms.service.PortfolioService.LineView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/lines")
public class LineController {

	/** officerId null leaves the line unassigned. schedule is the weekday or day of month, by frequency. */
	public record LineRequest(@NotBlank @Size(max = 120) String name, @NotNull Frequency frequency,
			@Size(max = 12) String schedule, Long officerId) {

		LineInput input() {
			return new LineInput(name, frequency, schedule, officerId);
		}
	}

	private final LineService lines;
	private final PortfolioService portfolio;

	public LineController(LineService lines, PortfolioService portfolio) {
		this.lines = lines;
		this.portfolio = portfolio;
	}

	/** Every line with today's due and collected figures. */
	@GetMapping
	public List<LineView> list() {
		return portfolio.lines(LineScope.of(CurrentUser.get()));
	}

	@GetMapping("/{id}")
	public LineView get(@PathVariable String id) {
		return portfolio.line(LineScope.of(CurrentUser.get()), id);
	}

	@PostMapping
	@PreAuthorize(UserController.MANAGERS)
	@ResponseStatus(HttpStatus.CREATED)
	public LineView create(@Valid @RequestBody LineRequest request) {
		CurrentUser current = CurrentUser.get();
		return portfolio.line(LineScope.of(current), lines.create(current, request.input()));
	}

	@PutMapping("/{id}")
	@PreAuthorize(UserController.MANAGERS)
	public LineView update(@PathVariable String id, @Valid @RequestBody LineRequest request) {
		CurrentUser current = CurrentUser.get();
		lines.update(current, id, request.input());
		return portfolio.line(LineScope.of(current), id);
	}

	/** Today's walking order for the line, nearest doorstep first. */
	@GetMapping("/{id}/route")
	public LineRoute route(@PathVariable String id) {
		return portfolio.route(LineScope.of(CurrentUser.get()), id);
	}
}
