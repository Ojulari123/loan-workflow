package com.work.loanworkflow.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import com.work.loanworkflow.dto.ChatMessage;
import com.work.loanworkflow.dto.CopilotRequest;
import com.work.loanworkflow.exception.AiUnavailableException;
import com.work.loanworkflow.exception.LoanException;
import com.work.loanworkflow.exception.LoanMessage;
import com.work.loanworkflow.service.CopilotService;

@RestController
@RequestMapping("/api/copilot")
@Tag(name = "Borrower Copilot", description = "Grounded AI chat where a borrower asks about their own loan and Claude Sonnet 5 answers using their real data")
public class CopilotController {

    private final CopilotService copilotService;

    public CopilotController() {
        this.copilotService = new CopilotService();
    }

    @PostMapping("/applicant/{applicantId}")
    @Operation(summary = "Chat with the borrower copilot",
            description = "Sends the conversation so far and returns Claude Sonnet 5's plain-text reply grounded in this applicant's real profile, applications, loans, and payments. The last message must have role \"user\". Returns 400 for an empty history or a non-user last message, 404 if the applicant is not found, and 502 if the AI service is unavailable.")
    public ResponseEntity<?> chat(@PathVariable int applicantId, @RequestBody CopilotRequest request) {
        List<ChatMessage> messages = request != null ? request.getMessages() : null;

        if (messages == null || messages.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new LoanMessage("messages must be a non-empty list"));
        }

        ChatMessage last = messages.get(messages.size() - 1);
        if (last.getRole() == null || !"user".equalsIgnoreCase(last.getRole())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new LoanMessage("the last message must have role \"user\""));
        }

        try {
            String reply = copilotService.chat(applicantId, messages);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (AiUnavailableException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new LoanMessage("Borrower copilot unavailable: " + e.getMessage()));
        } catch (LoanException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new LoanMessage(e.getMessage()));
        }
    }
}
