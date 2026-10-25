package com.microfin.lms.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microfin.lms.common.ApiException;
import com.microfin.lms.security.CurrentUser;
import com.microfin.lms.service.AssistantService;
import com.microfin.lms.service.LineScope;
import com.microfin.lms.service.AssistantService.ChatMessage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
public class AssistantController {

	public record MessageRequest(@NotBlank @Pattern(regexp = "user|assistant") String role,
			@NotBlank @Size(max = 4000) String content) {
	}

	/** Any {@code snapshot} a client still sends is ignored; the server builds its own. */
	public record ChatRequest(@Pattern(regexp = "en|ta") String locale,
			@NotEmpty @Size(max = 40) List<@Valid MessageRequest> messages) {
	}

	private final AssistantService assistant;
	private final ObjectMapper json;

	public AssistantController(AssistantService assistant, ObjectMapper json) {
		this.assistant = assistant;
		this.json = json;
	}

	/**
	 * The reply streams back as server-sent events, one JSON object per {@code data:} line:
	 * {@code {"type":"text","text":"..."}} chunks, then {@code {"type":"done"}} or
	 * {@code {"type":"error","message":"..."}}. {@code /ai/chat} is the path the web app already calls.
	 */
	@PostMapping(path = { "/ai/chat", "/api/v1/ai/chat" })
	public ResponseEntity<StreamingResponseBody> chat(@Valid @RequestBody ChatRequest request) {
		List<MessageRequest> messages = request.messages();
		if (!messages.get(0).role().equals("user") || !messages.get(messages.size() - 1).role().equals("user")) {
			throw ApiException.badRequest("BAD_CONVERSATION", "Conversation must start and end with the user");
		}
		// Read here, on the request thread: the streaming body runs on another one.
		LineScope scope = LineScope.of(CurrentUser.get());
		List<ChatMessage> history = messages.stream().map(m -> new ChatMessage(m.role(), m.content())).toList();
		String locale = request.locale() == null ? "en" : request.locale();

		StreamingResponseBody body = out -> assistant.chat(scope, locale, history, event -> {
			try {
				out.write(("data: " + json.writeValueAsString(event) + "\n\n").getBytes(StandardCharsets.UTF_8));
				out.flush();
			} catch (IOException e) {
				// The browser went away; stop reading from the model.
				throw new UncheckedIOException(e);
			}
		});
		return ResponseEntity.ok().contentType(MediaType.TEXT_EVENT_STREAM).cacheControl(CacheControl.noCache()).body(body);
	}
}
