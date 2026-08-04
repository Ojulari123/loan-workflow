package com.work.loanworkflow.exception;

/**
 * Thrown when the AI underwriting service cannot produce an assessment
 * (e.g. the ANTHROPIC_API_KEY is missing, or the Anthropic API call fails).
 * The controller maps this to HTTP 502 so a model outage never crashes the app.
 * The API key is never included in the message.
 */
public class AiUnavailableException extends RuntimeException {
    public AiUnavailableException(String message) {
        super(message);
    }
}
