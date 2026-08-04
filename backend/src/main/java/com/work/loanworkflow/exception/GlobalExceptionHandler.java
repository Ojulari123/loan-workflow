package com.work.loanworkflow.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Global handler that turns exceptions propagating out of controllers into clean,
 * specific HTTP responses with a readable JSON body.
 *
 * <p>Extends {@link ResponseEntityExceptionHandler} so Spring's built-in handling of
 * framework errors (malformed JSON, wrong path/param types, unsupported HTTP method,
 * unknown route) keeps returning its proper 4xx status instead of being swallowed by the
 * generic catch-all below.
 *
 * <p>Every error body contains a {@code message} field because the frontend reads error
 * text from {@code body.message}. It also includes {@code status} and {@code timestamp}.
 *
 * <p>Controllers that catch {@link LoanException} / {@link AiUnavailableException} inline
 * and return an explicit {@code ResponseEntity} (AI assessment 502/404, amortization 400,
 * borrower copilot) are unaffected: a {@code @RestControllerAdvice} only sees exceptions
 * that actually propagate out of the controller method.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final String GENERIC_MESSAGE = "Something went wrong. Please try again.";

    @ExceptionHandler(LoanException.class)
    public ResponseEntity<Map<String, Object>> handleLoanException(LoanException ex) {
        String message = ex.getMessage() == null ? "" : ex.getMessage();

        // Wrapped DB failures (e.g. "Database error: ...", "Database error during payment: ...")
        // are internal, not user errors: never echo raw DB text back to the client.
        if (message.startsWith("Database error")) {
            ex.printStackTrace();
            return build(HttpStatus.INTERNAL_SERVER_ERROR, GENERIC_MESSAGE);
        }

        // Missing-resource messages map to 404; every other LoanException is a validation
        // or business-rule error and maps to 400. These messages are author-written and
        // safe to surface to the user.
        HttpStatus status = message.toLowerCase().contains("not found")
                ? HttpStatus.NOT_FOUND
                : HttpStatus.BAD_REQUEST;

        return build(status, message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        // Log full detail server-side for debugging; return a generic body so no stack
        // trace or internal text ever leaks to the client.
        ex.printStackTrace();
        return build(HttpStatus.INTERNAL_SERVER_ERROR, GENERIC_MESSAGE);
    }

    /**
     * Spring's built-in handlers for framework errors (malformed JSON, wrong param/path
     * types, unsupported method, unknown route) build a {@link ProblemDetail} body that
     * exposes the error text under {@code detail}, not {@code message}. Mirror it into a
     * {@code message} property so the frontend, which reads {@code body.message}, still
     * finds error text for these framework-level errors too. Status codes are left intact.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode statusCode, WebRequest request) {
        ResponseEntity<Object> response = super.handleExceptionInternal(ex, body, headers, statusCode, request);
        if (response != null
                && response.getBody() instanceof ProblemDetail problem
                && problem.getDetail() != null) {
            problem.setProperty("message", problem.getDetail());
        }
        return response;
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("status", status.value());
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(status).body(body);
    }
}
