package com.microfin.lms.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.core.http.StreamResponse;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicIoException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.errors.UnauthorizedException;
import com.anthropic.models.beta.messages.BetaCacheControlEphemeral;
import com.anthropic.models.beta.messages.BetaOutputConfig;
import com.anthropic.models.beta.messages.BetaRawMessageStreamEvent;
import com.anthropic.models.beta.messages.BetaStopReason;
import com.anthropic.models.beta.messages.BetaTextBlockParam;
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microfin.lms.config.AppProperties;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Portfolio analytics assistant: answers branch staff's questions about collection efficiency,
 * risk and the loan book with Claude. The snapshot it reasons over is built here from the
 * database, never accepted from the client, so it cannot be shown another company's figures or
 * made-up ones.
 */
@Service
public class AssistantService {

	private static final Logger log = LoggerFactory.getLogger(AssistantService.class);

	public record ChatMessage(String role, String content) {
	}

	/** One server-sent event. type: text | done | error. */
	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record ChatEvent(String type, String text, String message) {

		static ChatEvent text(String text) {
			return new ChatEvent("text", text, null);
		}

		static ChatEvent done() {
			return new ChatEvent("done", null, null);
		}

		static ChatEvent error(String message) {
			return new ChatEvent("error", null, message);
		}
	}

	private static final String INSTRUCTIONS = """
			You are the analytics assistant inside Finance Easy, a loan management system used by a local microfinance branch in Tamil Nadu. Your users are branch managers and field collection officers who walk daily, weekly and monthly collection "lines" door to door.

			You receive a JSON snapshot of the branch portfolio. Answer only from it; if a question needs data the snapshot does not hold, say what is missing instead of estimating. Key definitions:
			- Collection efficiency = amount collected / amount due for the period.
			- PAR1 / PAR30 = outstanding on loans with any installment more than 0 / 30 days late, as a share of total outstanding.
			- Risk score = the rule-based 0-100 score described in risk.scoringMethod; each loan lists the factors that drove it.
			- risk.aging groups the open loans by how late their oldest unpaid installment is; risk.loans lists every open loan.

			How to answer:
			- Lead with the direct answer and the numbers behind it, then concrete next steps an officer can take this week (which line, which borrower, what action).
			- Format money in rupees with Indian grouping (₹1,24,500) and use lakh / crore for large figures.
			- Keep answers short: a sentence or two, then at most a handful of bullet points. Use "- " for bullets and **bold** sparingly; no tables or headings.
			- Name borrowers and loan numbers when it helps follow-up, but never speculate about a borrower's personal circumstances.""";

	private final AppProperties properties;
	private final InsightsService insights;
	private final ObjectMapper json;
	private final AtomicReference<AnthropicClient> client = new AtomicReference<>();

	public AssistantService(AppProperties properties, InsightsService insights, ObjectMapper json) {
		this.properties = properties;
		this.insights = insights;
		this.json = json;
	}

	/**
	 * Streams the reply as text events, ending with exactly one {@code done} or {@code error}.
	 * Never throws: failures are reported through the sink with a message fit to show staff.
	 */
	public void chat(LineScope scope, String locale, List<ChatMessage> messages, Consumer<ChatEvent> sink) {
		try {
			String language = "ta".equals(locale)
					? "Reply in Tamil (தமிழ்). Keep loan numbers, line names and figures as they appear in the data."
					: "Reply in English.";
			String snapshot = json.writeValueAsString(insights.assistantSnapshot(scope));

			MessageCreateParams.Builder params = MessageCreateParams.builder()
					.model(properties.ai().model())
					.maxTokens(16000L)
					// If a safety classifier declines the request, let the API re-run it on Anthropic's
					// recommended fallback model instead of returning a refusal.
					.addBeta("server-side-fallback-2026-07-01")
					.putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
					.outputConfig(BetaOutputConfig.builder().effort(BetaOutputConfig.Effort.MEDIUM).build())
					.systemOfBetaTextBlockParams(List.of(
							// The instructions never change, so they are cached; the snapshot follows the breakpoint.
							BetaTextBlockParam.builder().text(INSTRUCTIONS)
									.cacheControl(BetaCacheControlEphemeral.builder().build()).build(),
							BetaTextBlockParam.builder().text(language + "\n\nPortfolio snapshot:\n" + snapshot).build()));
			for (ChatMessage message : messages) {
				if (message.role().equals("assistant")) {
					params.addAssistantMessage(message.content());
				} else {
					params.addUserMessage(message.content());
				}
			}

			AtomicReference<BetaStopReason> stopReason = new AtomicReference<>();
			try (StreamResponse<BetaRawMessageStreamEvent> stream = client().beta().messages().createStreaming(params.build())) {
				stream.stream().forEach(event -> {
					event.contentBlockDelta().flatMap(delta -> delta.delta().text())
							.ifPresent(text -> sink.accept(ChatEvent.text(text.text())));
					event.messageDelta().flatMap(delta -> delta.delta().stopReason()).ifPresent(stopReason::set);
				});
			}

			if (BetaStopReason.REFUSAL.equals(stopReason.get())) {
				sink.accept(ChatEvent.error("The assistant could not answer that question."));
			} else if (BetaStopReason.MAX_TOKENS.equals(stopReason.get())) {
				sink.accept(ChatEvent.error("The answer was cut short. Try a narrower question."));
			} else {
				sink.accept(ChatEvent.done());
			}
		} catch (UncheckedIOException e) {
			// The client disconnected mid-answer; there is nobody left to tell.
			log.debug("[ai/chat] client went away", e);
		} catch (JsonProcessingException | RuntimeException e) {
			log.error("[ai/chat] failed", e);
			sink.accept(ChatEvent.error(describe(e)));
		}
	}

	/** Built on first use, so the API starts without AI credentials and only this feature is affected. */
	private AnthropicClient client() {
		AnthropicClient existing = client.get();
		if (existing != null) {
			return existing;
		}
		String apiKey = properties.ai().apiKey();
		AnthropicClient created = apiKey == null || apiKey.isBlank() ? AnthropicOkHttpClient.fromEnv()
				: AnthropicOkHttpClient.builder().apiKey(apiKey).build();
		return client.compareAndSet(null, created) ? created : client.get();
	}

	/** A message safe to show staff; details stay in the server log. */
	private static String describe(Exception error) {
		if (error instanceof UnauthorizedException) {
			return "The AI service is not configured (check ANTHROPIC_API_KEY).";
		}
		if (error instanceof RateLimitException) {
			return "The AI service is busy. Please try again in a minute.";
		}
		if (error instanceof AnthropicServiceException service) {
			return "The AI service returned an error (" + service.statusCode() + ").";
		}
		if (error instanceof AnthropicIoException) {
			return "Could not reach the AI service.";
		}
		// Raised before any request is sent; in practice, no credentials resolved.
		if (error instanceof AnthropicException || error instanceof IllegalStateException) {
			return "The AI service is not configured (check ANTHROPIC_API_KEY).";
		}
		return "Something went wrong while answering.";
	}
}
