package lisa.rag.dev.tech.api;

import org.springframework.ai.chat.ChatResponse;
import reactor.core.publisher.Flux;

/**
 * @author yummy
 * @version 1.0
 */
public interface IAiService {
    /**
     * Generates a chat response for a given model and message.
     *
     * @param model   The AI model to use for generation
     * @param message The input message to generate a response for
     * @return A ChatResponse containing the generated text
     */
    ChatResponse generate(String model, String message);

    /**
     * Generates a streaming chat response for a given model and message.
     *
     * @param model   The AI model to use for generation
     * @param message The input message to generate a response for
     * @return A Flux of ChatResponses for streaming the generated text
     */
    Flux<ChatResponse> generateStream(String model, String message);

    Flux<ChatResponse> generateStreamRag(String model, String ragTag, String message);
}
